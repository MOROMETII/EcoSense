import hashlib
from db import get_db
from services.jwt_service import create_token

def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def register_new_user(username, mail, password):
    if not username or not mail or not password:
        return {"error": "username, mail and password are required"}, 400

    if len(password) < 6:
        return {"error": "Password must be at least 6 characters"}, 400

    hpassword = _hash_password(password)
    db = get_db()
    cursor = db.cursor()

    cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
    if cursor.fetchone():
        cursor.close()
        db.close()
        return {"error": "Username already exists"}, 400

    cursor.execute("SELECT id FROM users WHERE email = %s", (mail,))
    if cursor.fetchone():
        cursor.close()
        db.close()
        return {"error": "Email already registered"}, 400

    cursor.execute(
        "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s)",
        (username, mail, hpassword)
    )
    db.commit()
    cursor.close()
    db.close()
    return {"status": "ok"}, 200



def check_login(username=None, mail=None, password=None):
    hpassword = _hash_password(password)
    db = get_db()
    cursor = db.cursor()

    if username:
        cursor.execute(
            "SELECT id, username, email FROM users WHERE username = %s AND password_hash = %s",
            (username, hpassword)
        )
    else:
        cursor.execute(
            "SELECT id, username, email FROM users WHERE email = %s AND password_hash = %s",
            (mail, hpassword)
        )

    user = cursor.fetchone()
    cursor.close()
    db.close()

    if not user:
        return {"error": "Invalid credentials"}, 401

    token = create_token(user["id"], user["username"])
    return {
        "status": "ok",
        "token": token,
        "user_id": user["id"],
        "username": user["username"]
    }, 200