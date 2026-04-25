#!/bin/python3
from flask import Flask, render_template, request,jsonify
import io
import os
import pandas as pd
from inference import predict_dataframe,predict_single,_load_artifacts
import sqlite3
import hashlib
import requests

from users import *
from db import get_db
from notifications import send_push, save_token, get_all_tokens, get_user_tokens

app = Flask(__name__,
            template_folder="template",
            static_folder="static"
)

_cache = _load_artifacts()

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
    """
    POST /predict/socket
    Body (JSON):
    {
        "socket_id": "SKT_01",
        "history": [
            {
                "kwh": 0.15, 
                "temp_ambient": 23.1,
                "humidity": 55.0, 
                "windows_open": 0,
                "timestamp": "2026-04-25 14:00:00"   ← optional but recommended
            },
            ...  (at least seq_len=12 entries, oldest → newest)
        ]
    }

    Response:
    {
        "socket_id": "SKT_01",
        "label_id": 1,
        "label_name": "Normal",
        "confidence": 0.91,
        "insight": "SKT_01 is operating normally (recent avg 0.15 kWh, overall avg 0.14 kWh).",
        "all_probs": {"Low": 0.04, "Normal": 0.91, "High": 0.03, "Wasteful": 0.02}
    }
    """
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
    """
    POST /predict/batch
    Body (JSON): list of row objects matching the CSV schema:
    [
        {
            "timestamp":    "2026-04-25 12:00:00",
            "room_id":      "ROOM_101",
            "socket_id":    "SKT_01",
            "kwh":          0.05,
            "temp_ambient": 22.0,
            "humidity":     45.0,
            "windows_open": 0
        },
        ...
    ]

    Response:
    {
        "count": 2520,
        "predictions": [
            {
                "timestamp": "...", "socket_id": "SKT_01", "kwh": 0.05,
                "predicted_label_id": 0, "predicted_label_name": "Low",
                "confidence": 0.97,
                "insight": "SKT_01 is functioning at a low, normal rate (avg 0.050 kWh over the last hour)."
            },
            ...
        ]
    }
    """
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
    """
    POST /predict/file
    Upload a CSV file directly (multipart/form-data).

    Form field: "file"  →  the CSV file

    The CSV must have at minimum:
        timestamp, socket_id, kwh, temp_ambient, humidity, windows_open

    Optional columns (passed through to output if present):
        room_id, label_id, label_name

    Response:
    {
        "filename": "test_data.csv",
        "count": 2520,
        "label_summary": {
            "Low": 1980, "Normal": 450, "High": 69, "Wasteful": 28
        },
        "predictions": [ { ... }, ... ]
    }
    """
    DEFAULT_CSV = "test_data.csv"

    # uploaded = request.files.get("file")

    # if uploaded and uploaded.filename != "":
    #     if not uploaded.filename.lower().endswith(".csv"):
    #         return jsonify({"error": "Only CSV files are supported."}), 415
    #     try:
    #         content = uploaded.read().decode("utf-8")
    #         df = pd.read_csv(io.StringIO(content), parse_dates=["timestamp"])
    #         source_name = uploaded.filename
    #     except Exception as e:
    #         return jsonify({"error": f"Could not parse uploaded CSV: {e}"}), 400
    # else:
    #     if not os.path.exists(DEFAULT_CSV):
    #         return jsonify({
    #             "error": f"No file uploaded and default '{DEFAULT_CSV}' not found on server."
    #         }), 404
    #     try:
    #         df = pd.read_csv(DEFAULT_CSV, parse_dates=["timestamp"])
    #         source_name = DEFAULT_CSV
    #     except Exception as e:
    #         return jsonify({"error": f"Could not read default CSV '{DEFAULT_CSV}': {e}"}), 500
    
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

@app.route("/register",methods=["POST"])
def register():
    if request.method != "POST":
        return {"error": "Method Not Allowed"}, 405 
    
    data=request.get_json()
    username=data.get("username")
    password=data.get("password")
    mail=data.get("mail")

    return register_new_user_endpoint(username,mail,password)

@app.route("/login",methods=["GET"])
def login():
    if request.method!="GET":
        return {"error": "Method Not Allowed"}, 405 
    
    username = request.args.get('username',None)
    password = request.args.get('password',None)
    mail = request.args.get('mail',None)

    if mail==None:
        return check_login_endpoint_username(username,password)
    else:
        return check_login_endpoint_mail(mail,password)

@app.route("/register-token", methods=['POST'])
def register_token():
    token = request.json.get("token")
    DeviceName = request.json.get("deviceName")
    username=request.json.get("username")
    print(DeviceName)
    save_token(token,DeviceName,username)
    return {"status": "ok"}

@app.route("/sendall", methods=['POST'])
def send():
    tokens=get_all_tokens()
    for token in tokens:
        send_push(token, "Hello", "Test notification")
    return {"status": "sent"}

@app.route("/predict/realtime", methods=["GET"])
def predict_realtime():
    """
    GET /predict/realtime?loop=true&room_id=ROOM_101&socket_id=SKT_01
    
    Streams real-time predictions from test_data.csv in an infinite loop.
    Each request gets the next batch of data for the specified socket.
    
    Query params:
    - room_id (optional): Filter by room_id
    - socket_id (optional): Filter by socket_id
    - loop (optional): If 'true', wraps around to beginning when EOF is reached
    
    Returns: JSON array of predictions with current kWh, label, insight, confidence
    """
    if not hasattr(predict_realtime, '_csv_data'):
        # Load CSV on first call
        if not os.path.exists("test_data.csv"):
            return jsonify({"error": "test_data.csv not found"}), 404
        predict_realtime._csv_data = pd.read_csv("test_data.csv", parse_dates=["timestamp"])
        predict_realtime._row_index = 0
    
    df = predict_realtime._csv_data
    room_id = request.args.get("room_id")
    socket_id = request.args.get("socket_id")
    loop = request.args.get("loop", "false").lower() == "true"
    
    # Filter by room_id and/or socket_id
    filtered_df = df.copy()
    if room_id:
        filtered_df = filtered_df[filtered_df["room_id"] == room_id]
    if socket_id:
        filtered_df = filtered_df[filtered_df["socket_id"] == socket_id]
    
    if filtered_df.empty:
        return jsonify({"error": "No matching data found"}), 404
    
    # Get batch of rows (e.g., next 12 rows for sequence)
    seq_len = _cache["cfg"]["seq_len"]
    start_idx = predict_realtime._row_index % len(filtered_df) if loop else predict_realtime._row_index
    end_idx = min(start_idx + seq_len, len(filtered_df))
    
    batch = filtered_df.iloc[start_idx:end_idx].copy()
    predict_realtime._row_index = (end_idx % len(filtered_df)) if loop else end_idx
    
    # Run predictions on batch
    result_df = predict_dataframe(batch)
    
    # Format response
    records = _predictions_to_records(result_df)
    return jsonify({
        "count": len(records),
        "records": records,
        "next_index": predict_realtime._row_index,
        "total_rows": len(filtered_df)
    }), 200


@app.route("/socket-history/<socket_id>", methods=["GET"])
def get_socket_history(socket_id):
    """
    GET /socket-history/SKT_01?room_id=ROOM_101&hours=24
    
    Returns the prediction history for a specific socket from test_data.csv.
    Includes kWh consumption, predictions, and insights.
    
    Query params:
    - room_id (optional): Filter by room_id
    - hours (optional): Limit to last N hours (default: 24)
    """
    if not os.path.exists("test_data.csv"):
        return jsonify({"error": "test_data.csv not found"}), 404
    
    df = pd.read_csv("test_data.csv", parse_dates=["timestamp"])
    
    # Filter by socket_id
    socket_df = df[df["socket_id"] == socket_id].copy()
    
    if socket_df.empty:
        return jsonify({"error": f"No data found for socket {socket_id}"}), 404
    
    # Optional: filter by room_id
    room_id = request.args.get("room_id")
    if room_id:
        socket_df = socket_df[socket_df["room_id"] == room_id]
    
    if socket_df.empty:
        return jsonify({"error": f"No data found for socket {socket_id} in room {room_id}"}), 404
    
    # Sort by timestamp
    socket_df = socket_df.sort_values("timestamp")
    
    # Get predictions
    result_df = predict_dataframe(socket_df)
    
    # Get latest values
    latest = result_df.iloc[-1]
    history = _predictions_to_records(result_df)
    
    return jsonify({
        "socket_id": socket_id,
        "room_id": latest.get("room_id", "unknown"),
        "current_kwh": float(latest["kwh"]),
        "predicted_label": latest.get("predicted_label_name", "unknown"),
        "confidence": float(latest.get("confidence", 0)),
        "insight": latest.get("insight", ""),
        "history_count": len(history),
        "history": history[-12:],  # Last 12 records
    }), 200


@app.route("/logout",methods=["GET","POST"])
def logout():
    return {"status":"iesi afara frate"},200

@app.route("/")
def index():
    return render_template("index.html")

if __name__=="__main__":
    app.run(debug=True, port=6969)