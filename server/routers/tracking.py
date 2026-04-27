# POST /data/socket         plug posts its kwh reading here
# POST /data/thermostat     thermostat posts temp + humidity here
# GET  /data/socket/<id>    get history for a socket (for charts)
# GET  /data/thermostat/<id> get history for a thermostat
# PATCH /sockets/<id>/command  turn plug on/off (send HTTP to ip_address)

#DOAR HISTROY THERMOSTAT TR IMPLEMENTAT , DATA SOCKET FAKUIT
#POST DATA ONLY DE LA THERMOSTAT 

from flask import Blueprint, request
from services.tracking_service import (
    save_thermostat_reading,
    get_thermostat_history,
    get_thermostat_status,
    save_socket_reading,
    get_socket_history
)
from services.auth_middleware import jwt_required

bp = Blueprint("tracking", __name__)

# ── THERMOSTAT ────────────────────────────────────────────

@bp.route("/data/thermostat", methods=["POST"])
def post_thermostat_data():
    data = request.get_json()
    if not data:
        return {"error": "Invalid JSON body"}, 400

    thermostat_id = data.get("thermostat_id")
    temp_ambient = data.get("temp_ambient")
    humidity = data.get("humidity")
    ts = data.get("ts")  # optional, e.g. "2026-04-25 03:00:00"

    if not thermostat_id or temp_ambient is None:
        return {"error": "thermostat_id and temp_ambient are required"}, 400

    save_thermostat_reading(thermostat_id, temp_ambient, humidity, ts)
    return {"status": "ok"}, 200

@bp.route("/data/thermostat/<int:thermostat_id>", methods=["GET"])
@jwt_required
def get_thermostat_data(thermostat_id: int):
    history = get_thermostat_history(thermostat_id, hours=6)
    return {"thermostat_id": thermostat_id, "history": history}, 200

@bp.route("/thermostat/<int:thermostat_id>/status", methods=["GET"])
def thermostat_status(thermostat_id: int):
    # no jwt_required — hardware can't send tokens
    status = get_thermostat_status(thermostat_id)
    return status

# ── SOCKET ────────────────────────────────────────────────

@bp.route("/data/socket", methods=["POST"])
def post_socket_data():
    data = request.get_json()
    if not data:
        return {"error": "Invalid JSON body"}, 400

    socket_id = data.get("socket_id")
    kwh = data.get("kwh")
    ts = data.get("ts")  # optional, e.g. "2026-04-25 03:00:00"

    if not socket_id or kwh is None:
        return {"error": "socket_id and kwh are required"}, 400

    save_socket_reading(socket_id, kwh, ts)
    return {"status": "ok"}, 200

@bp.route("/data/socket/<int:socket_id>", methods=["GET"])
@jwt_required
def get_socket_data(socket_id: int):
    history = get_socket_history(socket_id, hours=6)
    return {"socket_id": socket_id, "history": history}, 200