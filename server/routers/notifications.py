from flask import Blueprint, request
from services.push_service import (
    save_token,
    delete_user_token,
    send_push_to_all,
    send_push_to_user,
    get_all_tokens
)

bp = Blueprint("notifications", __name__)

# POST /register-token      already exists
# POST /sendall             already exists (debug)

@bp.route("/register-token", methods=["POST"])
def register_token():
    data = request.get_json()
    if not data:
        return {"error": "Invalid JSON body"}, 400

    token = data.get("token")
    device_name = data.get("deviceName")
    username = data.get("username")

    if not token or not device_name or not username:
        return {"error": "token, deviceName and username are required"}, 400

    save_token(token, device_name, username)
    return {"status": "ok"}, 200

@bp.route("/notify/all", methods=["POST"])
def notify_all():
    data = request.get_json()
    if not data:
        return {"error": "Invalid JSON body"}, 400

    title = data.get("title", "EcoSense")
    body = data.get("body")
    extra = data.get("data", {})

    if not body:
        return {"error": "body is required"}, 400

    tokens = get_all_tokens()
    if not tokens:
        return {"status": "no devices registered"}, 200

    results = send_push_to_all(title, body, extra)
    return {
        "status": "sent",
        "devices_notified": len(tokens),
        "results": results
    }, 200

@bp.route("/notify/user/<int:user_id>", methods=["POST"])
def notify_user(user_id: int):
    data = request.get_json()
    if not data:
        return {"error": "Invalid JSON body"}, 400

    title = data.get("title", "EcoSense")
    body = data.get("body")
    extra = data.get("data", {})

    if not body:
        return {"error": "body is required"}, 400

    results = send_push_to_user(user_id, title, body, extra)
    if not results:
        return {"status": "no devices found for user"}, 200

    return {
        "status": "sent",
        "devices_notified": len(results),
        "results": results
    }, 200