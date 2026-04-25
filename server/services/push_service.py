import requests
from db import get_db

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

def save_token(token: str, device_name: str, username: str):
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        """
        INSERT INTO device (user_id, notif_token, name)
        VALUES (
            (SELECT id FROM users WHERE username = %s),
            %s,
            %s
        )
        ON CONFLICT (notif_token) DO UPDATE SET name = EXCLUDED.name
        """,
        (username, token, device_name)
    )
    db.commit()
    cursor.close()
    db.close()

def delete_user_token(token: str, username: str):
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        """
        DELETE FROM device
        WHERE notif_token = %s
        AND user_id = (SELECT id FROM users WHERE username = %s)
        """,
        (token, username)
    )
    db.commit()
    cursor.close()
    db.close()

def get_all_tokens() -> list[str]:
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT notif_token FROM device")
    rows = cursor.fetchall()
    cursor.close()
    db.close()
    return [row["notif_token"] for row in rows]

def get_user_tokens(user_id: int) -> list[str]:
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "SELECT notif_token FROM device WHERE user_id = %s",
        (user_id,)
    )
    rows = cursor.fetchall()
    cursor.close()
    db.close()
    return [row["notif_token"] for row in rows]

def send_push(token: str, title: str, body: str, data: dict = {}):
    payload = {
        "to": token,
        "title": title,
        "body": body,
        "sound": "default",
        "data": data
    }
    try:
        resp = requests.post(EXPO_PUSH_URL, json=payload, timeout=5)
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.RequestException as e:
        print(f"Push notification failed for token {token}: {e}")
        return None

def send_push_to_user(user_id: int, title: str, body: str, data: dict = {}):
    tokens = get_user_tokens(user_id)
    results = []
    for token in tokens:
        result = send_push(token, title, body, data)
        results.append(result)
    return results

def send_push_to_all(title: str, body: str, data: dict = {}):
    tokens = get_all_tokens()
    results = []
    for token in tokens:
        result = send_push(token, title, body, data)
        results.append(result)
    return results