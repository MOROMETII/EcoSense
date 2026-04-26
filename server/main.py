#!/bin/python3
from flask import Flask, render_template, request, jsonify
import io
import os
import pandas as pd
from inference import predict_dataframe, predict_single, _load_artifacts
import sqlite3
import hashlib
import requests

from users import *
from db import get_db
from notifications import send_push, save_token, get_all_tokens, get_user_tokens, delete_user_token

app = Flask(__name__,
            template_folder="template",
            static_folder="static"
)

_cache = _load_artifacts()

_csv_dataframe = None

def get_cached_df():
    global _csv_dataframe
    if _csv_dataframe is None:
        if not os.path.exists("test_data.csv"):
            raise FileNotFoundError("test_data.csv not found")
        _csv_dataframe = pd.read_csv("test_data.csv", parse_dates=["timestamp"])
    return _csv_dataframe

def _get_features():
    return _cache['cfg']['features']

def _predictions_to_records(result_df: pd.DataFrame) -> list:
    out_cols = (
        ["timestamp", "room_id", "socket_id"]
        + ["predicted_label_id", "predicted_label_name", "confidence", "insight"]
    )
    out_cols = [c for c in out_cols if c in result_df.columns]
    return result_df[out_cols].to_dict(orient="records")

@app.route("/health", methods=["GET"])
def health():
    """
    GET /health
    Returns 200 if the model is loaded and ready.
    """
    if _cache['model'] is None:
        return jsonify({"status": "error", "message": "Model not loaded"}), 500
    return jsonify({"status": "ok", "model": "LSTM classifier"}), 200

@app.route("/labels", methods=["GET"])
def labels():
    """
    GET /labels
    Returns the label id → name mapping used by the model.
    """
    cfg = _cache["cfg"]
    return jsonify({
        str(i): name for i, name in enumerate(cfg["label_names"])
    }), 200

@app.route("/predict/socket", methods=["POST"])
def predict_socket():
    body = request.get_json(force=True, silent=True)
    if not body:
        return jsonify({"error": "Invalid JSON body."}), 400

    socket_id = body.get("socket_id", "unknown")
    history   = body.get("history")

    if not isinstance(history, list) or len(history) == 0:
        return jsonify({"error": "'history' must be a non-empty list."}), 400

    missing = [f for f in _get_features() if f not in history[0]]
    if missing:
        return jsonify({"error": f"Missing feature(s) in history rows: {missing}"}), 400

    for row in history:
        row.setdefault("socket_id", socket_id)

    result = predict_single(history)
    if "error" in result:
        return jsonify(result), 422

    return jsonify({"socket_id": socket_id, **result}), 200

@app.route("/predict/batch", methods=["POST"])
def predict_batch():
    body = request.get_json(force=True, silent=True)
    if not isinstance(body, list) or len(body) == 0:
        return jsonify({"error": "'body' must be a non-empty JSON array."}), 400

    try:
        df = pd.DataFrame(body)
        df["timestamp"] = pd.to_datetime(df["timestamp"])
    except Exception as e:
        return jsonify({"error": f"Could not parse rows into a dataframe: {e}"}), 400

    missing = [f for f in _get_features() if f not in df.columns]
    if missing:
        return jsonify({"error": f"Missing column(s): {missing}"}), 400

    if "socket_id" not in df.columns:
        return jsonify({"error": "Missing required column: 'socket_id'"}), 400

    result_df = predict_dataframe(df)
    records   = _predictions_to_records(result_df)
    return jsonify({"count": len(records), "predictions": records}), 200


@app.route("/predict/file", methods=["POST"])
def predict_file():
    DEFAULT_CSV = "test_data.csv"
    df = pd.read_csv(DEFAULT_CSV, parse_dates=["timestamp"])
    source_name = DEFAULT_CSV

    missing = [f for f in _get_features() if f not in df.columns]
    if missing:
        return jsonify({"error": f"Missing column(s) in CSV: {missing}"}), 400

    if "socket_id" not in df.columns:
        return jsonify({"error": "Missing required column: 'socket_id'"}), 400

    result_df = predict_dataframe(df)
    records   = _predictions_to_records(result_df)

    predicted = result_df[result_df["predicted_label_id"] != -1]
    label_summary = predicted["predicted_label_name"].value_counts().to_dict()

    return jsonify({
        "filename":      source_name,
        "count":         len(records),
        "label_summary": label_summary,
        "predictions":   records,
    }), 200


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found."}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"error": "Method not allowed."}), 405

@app.errorhandler(500)
def internal_error(e):
    return jsonify({"error": "Internal server error.", "detail": str(e)}), 500

@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    mail = data.get("mail")
    return register_new_user_endpoint(username, mail, password)

@app.route("/login", methods=["GET"])
def login():
    username = request.args.get('username', None)
    password = request.args.get('password', None)
    mail = request.args.get('mail', None)
    if mail is None:
        return check_login_endpoint_username(username, password)
    else:
        return check_login_endpoint_mail(mail, password)

@app.route("/register-token", methods=['POST'])
def register_token():
    token = request.json.get("token")
    DeviceName = request.json.get("deviceName")
    username = request.json.get("username")
    save_token(token, DeviceName, username)
    return {"status": "ok"}

@app.route("/sendall", methods=['POST'])
def send():
    tokens = get_all_tokens()
    for token in tokens:
        send_push(token, "Hello", "Test notification")
    return {"status": "sent"}


# ─── Per-socket cursor store ──────────────────────────────────────────────────
# Maps socket_id → current row index within that socket's filtered dataframe.
# This way each socket advances independently and loops correctly over the day.
_socket_cursors: dict[str, int] = {}


@app.route("/predict/realtime", methods=["GET"])
def predict_realtime():
    """
    GET /predict/realtime?socket_id=SKT_01&room_id=ROOM_101&loop=true&batch=1

    Advances a per-socket cursor through the CSV so every call returns a NEW
    reading. When loop=true (default) the cursor wraps around to the start of
    the day once it reaches the end, simulating a live 24-hour cycle.

    Query params:
      socket_id  – required
      room_id    – optional filter
      loop       – 'true' (default) | 'false'
      batch      – how many rows to advance per call (default 1)
      reset      – 'true' to restart this socket's cursor from 0

    Response:
    {
      "socket_id": "SKT_01",
      "current_kwh": 0.123,
      "predicted_label_id": 1,
      "predicted_label_name": "Normal",
      "confidence": 0.91,
      "insight": "...",
      "cursor": 42,
      "total_rows": 210
    }
    """
    socket_id = request.args.get("socket_id")
    if not socket_id:
        return jsonify({"error": "socket_id query param is required"}), 400

    room_id = request.args.get("room_id")
    loop    = request.args.get("loop", "true").lower() == "true"
    batch   = max(1, int(request.args.get("batch", "1")))
    reset   = request.args.get("reset", "false").lower() == "true"

    try:
        df = get_cached_df()
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404

    # Filter to this socket (and optionally room)
    filtered = df[df["socket_id"] == socket_id].copy()
    if room_id:
        filtered = filtered[filtered["room_id"] == room_id]
    if filtered.empty:
        return jsonify({"error": f"No data found for socket {socket_id}"}), 404

    filtered = filtered.sort_values("timestamp").reset_index(drop=True)
    total    = len(filtered)
    seq_len  = _cache["cfg"]["seq_len"]

    # Per-socket cursor, independent of every other socket
    cursor_key = f"{socket_id}:{room_id or ''}"
    if reset or cursor_key not in _socket_cursors:
        _socket_cursors[cursor_key] = 0

    cursor = _socket_cursors[cursor_key]

    # We need seq_len rows ending at cursor to get a valid prediction.
    # Window: [cursor - seq_len + 1 .. cursor] wrapped around for loop mode.
    end_idx   = cursor % total if loop else min(cursor, total - 1)
    start_idx = end_idx - seq_len + 1

    if start_idx < 0:
        if loop:
            # Wrap: take tail from end + head from beginning
            head = filtered.iloc[0 : end_idx + 1]
            tail = filtered.iloc[total + start_idx :]
            window = pd.concat([tail, head]).reset_index(drop=True)
        else:
            # Not enough history yet — pad from the start
            window = filtered.iloc[0 : end_idx + 1]
    else:
        window = filtered.iloc[start_idx : end_idx + 1]

    # Run the LSTM on the window
    result_df = predict_dataframe(window)

    # Only rows that got a real prediction (not -1 = insufficient data)
    valid = result_df[result_df["predicted_label_id"] != -1]
    if valid.empty:
        # Advance and return a placeholder
        _socket_cursors[cursor_key] = (cursor + batch) % total if loop else min(cursor + batch, total - 1)
        return jsonify({"error": "insufficient data for this window, cursor advanced"}), 202

    latest = valid.iloc[-1]

    # Advance cursor by batch steps
    _socket_cursors[cursor_key] = (cursor + batch) % total if loop else min(cursor + batch, total - 1)

    return jsonify({
        "socket_id":            socket_id,
        "timestamp":            str(latest["timestamp"]),
        "current_kwh":          float(latest.get("kwh", 0)),
        "predicted_label_id":   int(latest["predicted_label_id"]),
        "predicted_label_name": str(latest["predicted_label_name"]),
        "confidence":           float(latest.get("confidence", 0)),
        "insight":              str(latest.get("insight", "")),
        "cursor":               _socket_cursors[cursor_key],
        "total_rows":           total,
    }), 200


@app.route("/socket-history/<socket_id>", methods=["GET"])
def get_socket_history(socket_id):
    """
    GET /socket-history/<socket_id>?room_id=ROOM_101&hours=24

    Returns the last N hours of history for a socket with predictions,
    plus summary fields for the modal header.

    The 'hours' param controls how many data points to return in history[]
    (default 24 so the sparkline covers a full day).
    """
    try:
        df = get_cached_df()
    except FileNotFoundError as e:
        return jsonify({"error": str(e)}), 404

    socket_df = df[df["socket_id"] == socket_id].copy()
    if socket_df.empty:
        return jsonify({"error": f"No data found for socket {socket_id}"}), 404

    room_id = request.args.get("room_id")
    if room_id:
        socket_df = socket_df[socket_df["room_id"] == room_id]
    if socket_df.empty:
        return jsonify({"error": f"No data found for socket {socket_id} in room {room_id}"}), 404

    hours = int(request.args.get("hours", "24"))

    socket_df = socket_df.sort_values("timestamp").reset_index(drop=True)

    # Run predictions over ALL rows so the LSTM has enough context
    result_df = predict_dataframe(socket_df)

    # Rows that actually got a valid prediction
    valid_df = result_df[result_df["predicted_label_id"] != -1].copy()

    # Grab the last `hours` valid rows for the history array
    history_slice = valid_df.tail(hours)
    history = _predictions_to_records(history_slice)

    # Also attach the raw kwh value from the original frame so the chart works
    # _predictions_to_records only keeps cols that exist; kwh isn't in out_cols.
    # We add it explicitly here.
    kwh_series = history_slice["kwh"].tolist() if "kwh" in history_slice.columns else []
    for i, rec in enumerate(history):
        rec["kwh"] = float(kwh_series[i]) if i < len(kwh_series) else 0.0

    latest = valid_df.iloc[-1] if not valid_df.empty else result_df.iloc[-1]

    return jsonify({
        "socket_id":      socket_id,
        "room_id":        str(latest.get("room_id", "unknown")),
        "current_kwh":    float(latest.get("kwh", 0)),
        "predicted_label": str(latest.get("predicted_label_name", "unknown")),
        "confidence":     float(latest.get("confidence", 0)),
        "insight":        str(latest.get("insight", "")),
        "history_count":  len(history),
        "history":        history,
    }), 200


@app.route("/room-data/<room_id>", methods=["GET"])
def get_room_data(room_id):
    try:
        df = get_cached_df()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    room_df = df[df["room_id"] == room_id].copy()
    if room_df.empty:
        return jsonify({"error": "No data found for this room"}), 404

    latest_per_socket = room_df.sort_values("timestamp").groupby("socket_id").tail(1)
    sockets_summary = latest_per_socket[["socket_id", "kwh"]].to_dict(orient="records")

    energy_history = room_df.groupby("timestamp")["kwh"].sum().reset_index()
    energy_history = energy_history.sort_values("timestamp").tail(24)

    temp_history = room_df.groupby("timestamp")["temp_ambient"].mean().reset_index()
    temp_history = temp_history.sort_values("timestamp").tail(24)

    return jsonify({
        "room_id":        room_id,
        "sockets":        sockets_summary,
        "energy_history": energy_history.to_dict(orient="records"),
        "temp_history":   temp_history.to_dict(orient="records"),
    }), 200

# ─── Per-room cursor store ────────────────────────────────────────────────────
_room_cursors: dict[str, int] = {}

@app.route("/room-realtime/<room_id>", methods=["GET"])
def get_room_realtime(room_id):
    loop = request.args.get("loop", "true").lower() == "true"

    try:
        df = get_cached_df()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    room_df = df[df["room_id"] == room_id]
    if room_df.empty:
        return jsonify({"error": "No data found for this room"}), 404

    timestamps = sorted(room_df["timestamp"].unique())
    total_steps = len(timestamps)

    if total_steps == 0:
        return jsonify({"error": "No timestamps found"}), 404
    
    if room_id not in _room_cursors:
        _room_cursors[room_id] = 0

    cursor = _room_cursors[room_id]
    current_ts = timestamps[cursor]
    step_df = room_df[room_df["timestamp"] == current_ts]

    total_kwh = step_df["kwh"].sum()
    avg_temp = step_df["temp_ambient"].mean()
    sockets_summary = step_df[["socket_id", "kwh"]].to_dict(orient="records")

    _room_cursors[room_id] = (cursor + 1) % total_steps if loop else min(cursor + 1, total_steps - 1)

    return jsonify({
        "room_id": room_id,
        "timestamp": str(current_ts),
        "total_kwh": float(total_kwh),
        "avg_temp": float(avg_temp),
        "sockets": sockets_summary,
        "cursor": cursor,
        "total_steps": total_steps
    }), 200


@app.route("/logout", methods=["GET", "POST"])
def logout():
    # token = request.json.get("token")
    # DeviceName = request.json.get("deviceName")
    # username=request.json.get("username")
    # delete_user_token(token,DeviceName,username)
    return {"status":"iesi afara frate"},200

def get_thermostat_status(thermostat_id: int):
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "SELECT is_online FROM thermostat WHERE id = ?",
        (thermostat_id,)
    )
    row = cursor.fetchone()
    cursor.close()
    db.close()

    if not row:
        return {"error": "Thermostat not found"}, 404

    return {"status": 1 if row["is_online"] else 0}, 200

def save_thermostat_reading(thermostat_id: int, temp_ambient: float, humidity: float = None):
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        """
        INSERT INTO data_thermostat (thermostat_id, temp_ambient, humidity)
        VALUES (?, ?, ?)
        """,
        (thermostat_id, temp_ambient, humidity)
    )
    db.commit()
    cursor.close()
    db.close()
    
@app.route("/thermostat/<int:thermostat_id>/status", methods=["GET"])
def thermostat_status(thermostat_id: int):
    # no jwt_required — hardware can't send tokens
    status = get_thermostat_status(thermostat_id)
    return status



@app.route("/data/thermostat", methods=["POST"])
def post_thermostat_data():
    data = request.get_json()
    if not data:
        return {"error": "Invalid JSON body"}, 400

    thermostat_id = data.get("thermostat_id")
    temp_ambient = data.get("temp_ambient")
    humidity = data.get("humidity")

    if not thermostat_id or temp_ambient is None:
        return {"error": "thermostat_id and temp_ambient are required"}, 400

    save_thermostat_reading(thermostat_id, temp_ambient, humidity)
    return {"status": "ok"}, 200


@app.route("/thermostat/<int:thermostat_id>/set_status",methods=["POST"])
def set_status(thermostat_id: int):
    data = request.get_json(force=True, silent=True) or {}

    if "is_online" in data:
        raw = data.get("is_online")
        if not isinstance(raw, bool):
            return {"error": "'is_online' must be a boolean"}, 400
        is_online = 1 if raw else 0
    elif "status" in data:
        raw = data.get("status")
        if raw in (0, 1):
            is_online = int(raw)
        elif isinstance(raw, bool):
            is_online = 1 if raw else 0
        else:
            return {"error": "'status' must be 0/1 (or boolean)"}, 400
    else:
        return {"error": "Missing 'is_online' (bool) or 'status' (0/1) in JSON body"}, 400

    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "UPDATE thermostat SET is_online = ? WHERE id = ?",
        (is_online, thermostat_id)
    )
    updated = cursor.rowcount
    db.commit()
    cursor.close()
    db.close()

    if updated == 0:
        return {"error": "Thermostat not found"}, 404

    return {"status": "ok", "thermostat_id": thermostat_id, "is_online": is_online}, 200


@app.route("/")
def index():
    return render_template("index.html")

if __name__ == "__main__":
    app.run(debug=True, port=6969)