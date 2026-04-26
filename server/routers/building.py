# POST /floors              create a floor
# GET  /floors              list floors for user
# POST /floors/<id>/rooms   create a room
# GET  /floors/<id>/rooms   list rooms
# POST /rooms/<id>/sockets  add a socket to a room
# POST /rooms/<id>/objects  add a door/window
# POST /rooms/<id>/thermostats  add a thermostat
# PATCH /sockets/<id>       update socket (name, ip, online status)
# PATCH /thermostats/<id>       update thermostat (name, ip, online status)

# DELETE /sockets/<id>      remove socket
# DELETE /thermostats/<id>      remove thermostat

#->list all sockets/hardware in a room
#alert stuff?
from flask import Blueprint, request
from services.auth_middleware import jwt_required
from services.building_service import (
    create_floor, get_floors,
    create_room, get_rooms,
    add_socket, update_socket, delete_socket, get_room_sockets,
    add_thermostat, update_thermostat, delete_thermostat, get_room_thermostats,
    add_object, get_room_objects
)

bp = Blueprint("building", __name__)

# ── FLOORS ──────────────────────────────────────────────

@bp.route("/floors", methods=["POST"])
@jwt_required
def post_floor():
    data = request.get_json()
    if not data:
        return {"error": "Invalid JSON body"}, 400
    level = data.get("level")
    label = data.get("label")
    if level is None or not label:
        return {"error": "level and label are required"}, 400
    return create_floor(request.user_id, level, label)

@bp.route("/floors", methods=["GET"])
@jwt_required
def list_floors():
    return get_floors(request.user_id)

# ── ROOMS ────────────────────────────────────────────────

@bp.route("/floors/<int:floor_id>/rooms", methods=["POST"])
@jwt_required
def post_room(floor_id: int):
    data = request.get_json()
    if not data:
        return {"error": "Invalid JSON body"}, 400
    name = data.get("name")
    if not name:
        return {"error": "name is required"}, 400
    return create_room(floor_id, request.user_id, name)

@bp.route("/floors/<int:floor_id>/rooms", methods=["GET"])
@jwt_required
def list_rooms(floor_id: int):
    return get_rooms(floor_id, request.user_id)

# ── SOCKETS ──────────────────────────────────────────────

@bp.route("/rooms/<int:room_id>/sockets", methods=["POST"])
@jwt_required
def post_socket(room_id: int):
    data = request.get_json()
    if not data:
        return {"error": "Invalid JSON body"}, 400
    name = data.get("name")
    x_norm = data.get("x_norm")
    y_norm = data.get("y_norm")
    ip_address = data.get("ip_address")
    if not name or x_norm is None or y_norm is None:
        return {"error": "name, x_norm and y_norm are required"}, 400
    return add_socket(room_id, request.user_id, name, x_norm, y_norm, ip_address)

@bp.route("/rooms/<int:room_id>/sockets", methods=["GET"])
@jwt_required
def list_sockets(room_id: int):
    return get_room_sockets(room_id, request.user_id)

@bp.route("/sockets/<int:socket_id>", methods=["PATCH"])
@jwt_required
def patch_socket(socket_id: int):
    data = request.get_json()
    if not data:
        return {"error": "Invalid JSON body"}, 400
    return update_socket(socket_id, request.user_id, data)

@bp.route("/sockets/<int:socket_id>", methods=["DELETE"])
@jwt_required
def remove_socket(socket_id: int):
    return delete_socket(socket_id, request.user_id)

# ── THERMOSTATS ───────────────────────────────────────────

@bp.route("/rooms/<int:room_id>/thermostats", methods=["POST"])
@jwt_required
def post_thermostat(room_id: int):
    data = request.get_json()
    if not data:
        return {"error": "Invalid JSON body"}, 400
    name = data.get("name")
    x_norm = data.get("x_norm")
    y_norm = data.get("y_norm")
    ip_address = data.get("ip_address")
    if not name or x_norm is None or y_norm is None:
        return {"error": "name, x_norm and y_norm are required"}, 400
    return add_thermostat(room_id, request.user_id, name, x_norm, y_norm, ip_address)

@bp.route("/rooms/<int:room_id>/thermostats", methods=["GET"])
@jwt_required
def list_thermostats(room_id: int):
    return get_room_thermostats(room_id, request.user_id)

@bp.route("/thermostats/<int:thermostat_id>", methods=["PATCH"])
@jwt_required
def patch_thermostat(thermostat_id: int):
    data = request.get_json()
    if not data:
        return {"error": "Invalid JSON body"}, 400
    return update_thermostat(thermostat_id, request.user_id, data)

@bp.route("/thermostats/<int:thermostat_id>", methods=["DELETE"])
@jwt_required
def remove_thermostat(thermostat_id: int):
    return delete_thermostat(thermostat_id, request.user_id)

# ── OBJECTS ───────────────────────────────────────────────

@bp.route("/rooms/<int:room_id>/objects", methods=["POST"])
@jwt_required
def post_object(room_id: int):
    data = request.get_json()
    if not data:
        return {"error": "Invalid JSON body"}, 400

    obj_type    = (data.get("type") or "").upper()
    wall_side   = (data.get("wall_side") or "").lower()
    wall_offset = data.get("wall_offset")
    is_open     = data.get("is_open", False)

    if obj_type not in ("DOOR", "WINDOW"):
        return {"error": "type must be DOOR or WINDOW"}, 400
    if wall_side not in ("top", "bottom", "left", "right"):
        return {"error": "wall_side must be top, bottom, left or right"}, 400
    if wall_offset is None:
        return {"error": "wall_offset is required"}, 400

    return add_object(room_id, request.user_id, obj_type, wall_side, wall_offset, is_open)

@bp.route("/rooms/<int:room_id>/objects", methods=["GET"])
@jwt_required
def list_objects(room_id: int):
    return get_room_objects(room_id, request.user_id)