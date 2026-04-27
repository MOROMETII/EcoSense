from flask import request, jsonify
from functools import wraps
from services.jwt_service import decode_token

def jwt_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401

        token = auth_header.split(" ")[1]
        payload = decode_token(token)

        if not payload:
            return jsonify({"error": "Invalid or expired token"}), 401

        request.user_id = payload["user_id"]
        request.username = payload["username"]
        return f(*args, **kwargs)
    return decorated