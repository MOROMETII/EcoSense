from db import get_db

def _room_belongs_to_user(room_id: int, user_id: int, cursor) -> bool:
    cursor.execute(
        """
        SELECT r.id FROM room r
        JOIN floor f ON f.id = r.floor_id
        WHERE r.id = %s AND f.user_id = %s
        """,
        (room_id, user_id)
    )
    return cursor.fetchone() is not None

def _socket_belongs_to_user(socket_id: int, user_id: int, cursor) -> bool:
    cursor.execute(
        """
        SELECT s.id FROM socket s
        JOIN room r ON r.id = s.room_id
        JOIN floor f ON f.id = r.floor_id
        WHERE s.id = %s AND f.user_id = %s
        """,
        (socket_id, user_id)
    )
    return cursor.fetchone() is not None

def _thermostat_belongs_to_user(thermostat_id: int, user_id: int, cursor) -> bool:
    cursor.execute(
        """
        SELECT t.id FROM thermostat t
        JOIN room r ON r.id = t.room_id
        JOIN floor f ON f.id = r.floor_id
        WHERE t.id = %s AND f.user_id = %s
        """,
        (thermostat_id, user_id)
    )
    return cursor.fetchone() is not None

# ── FLOORS ──────────────────────────────────────────────

def create_floor(user_id: int, level: int, label: str):
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "INSERT INTO floor (user_id, level, label) VALUES (%s, %s, %s) RETURNING id",
        (user_id, level, label)
    )
    floor_id = cursor.fetchone()["id"]
    db.commit()
    cursor.close()
    db.close()
    return {"status": "ok", "floor_id": floor_id}, 201

def get_floors(user_id: int):
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "SELECT id, level, label FROM floor WHERE user_id = %s ORDER BY level ASC",
        (user_id,)
    )
    rows = cursor.fetchall()
    cursor.close()
    db.close()
    return {"floors": [dict(r) for r in rows]}, 200

# ── ROOMS ────────────────────────────────────────────────

def create_room(floor_id: int, user_id: int, name: str):
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "SELECT id FROM floor WHERE id = %s AND user_id = %s",
        (floor_id, user_id)
    )
    if not cursor.fetchone():
        cursor.close()
        db.close()
        return {"error": "Floor not found"}, 404
    cursor.execute(
        "INSERT INTO room (floor_id, name) VALUES (%s, %s) RETURNING id",
        (floor_id, name)
    )
    room_id = cursor.fetchone()["id"]
    db.commit()
    cursor.close()
    db.close()
    return {"status": "ok", "room_id": room_id}, 201

def get_rooms(floor_id: int, user_id: int):
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "SELECT id FROM floor WHERE id = %s AND user_id = %s",
        (floor_id, user_id)
    )
    if not cursor.fetchone():
        cursor.close()
        db.close()
        return {"error": "Floor not found"}, 404
    cursor.execute(
        """
        SELECT r.id, r.name FROM room r
        WHERE r.floor_id = %s
        ORDER BY r.id ASC
        """,
        (floor_id,)
    )
    rows = cursor.fetchall()
    cursor.close()
    db.close()
    return {"rooms": [dict(r) for r in rows]}, 200

# ── SOCKETS ──────────────────────────────────────────────

def add_socket(room_id: int, user_id: int, name: str, x_norm: float, y_norm: float, ip_address: str = None):
    db = get_db()
    cursor = db.cursor()
    if not _room_belongs_to_user(room_id, user_id, cursor):
        cursor.close()
        db.close()
        return {"error": "Room not found"}, 404
    cursor.execute(
        """
        INSERT INTO socket (room_id, name, x_norm, y_norm, ip_address)
        VALUES (%s, %s, %s, %s, %s) RETURNING id
        """,
        (room_id, name, x_norm, y_norm, ip_address)
    )
    socket_id = cursor.fetchone()["id"]
    db.commit()
    cursor.close()
    db.close()
    return {"status": "ok", "socket_id": socket_id}, 201

def get_room_sockets(room_id: int, user_id: int):
    db = get_db()
    cursor = db.cursor()
    if not _room_belongs_to_user(room_id, user_id, cursor):
        cursor.close()
        db.close()
        return {"error": "Room not found"}, 404
    cursor.execute(
        "SELECT id, name, x_norm, y_norm, ip_address, is_online FROM socket WHERE room_id = %s",
        (room_id,)
    )
    rows = cursor.fetchall()
    cursor.close()
    db.close()
    return {"sockets": [dict(r) for r in rows]}, 200

def update_socket(socket_id: int, user_id: int, data: dict):
    allowed = {"name", "ip_address", "is_online", "x_norm", "y_norm"}
    fields = {k: v for k, v in data.items() if k in allowed}
    if not fields:
        return {"error": "No valid fields to update"}, 400
    db = get_db()
    cursor = db.cursor()
    if not _socket_belongs_to_user(socket_id, user_id, cursor):
        cursor.close()
        db.close()
        return {"error": "Socket not found"}, 404
    set_clause = ", ".join(f"{k} = %s" for k in fields)
    values = list(fields.values()) + [socket_id]
    cursor.execute(f"UPDATE socket SET {set_clause} WHERE id = %s", values)
    db.commit()
    cursor.close()
    db.close()
    return {"status": "ok"}, 200

def delete_socket(socket_id: int, user_id: int):
    db = get_db()
    cursor = db.cursor()
    if not _socket_belongs_to_user(socket_id, user_id, cursor):
        cursor.close()
        db.close()
        return {"error": "Socket not found"}, 404
    cursor.execute("DELETE FROM socket WHERE id = %s", (socket_id,))
    db.commit()
    cursor.close()
    db.close()
    return {"status": "ok"}, 200

# ── THERMOSTATS ───────────────────────────────────────────

def add_thermostat(room_id: int, user_id: int, name: str, x_norm: float, y_norm: float, ip_address: str = None):
    db = get_db()
    cursor = db.cursor()
    if not _room_belongs_to_user(room_id, user_id, cursor):
        cursor.close()
        db.close()
        return {"error": "Room not found"}, 404
    cursor.execute(
        """
        INSERT INTO thermostat (room_id, name, x_norm, y_norm, ip_address)
        VALUES (%s, %s, %s, %s, %s) RETURNING id
        """,
        (room_id, name, x_norm, y_norm, ip_address)
    )
    thermostat_id = cursor.fetchone()["id"]
    db.commit()
    cursor.close()
    db.close()
    return {"status": "ok", "thermostat_id": thermostat_id}, 201

def get_room_thermostats(room_id: int, user_id: int):
    db = get_db()
    cursor = db.cursor()
    if not _room_belongs_to_user(room_id, user_id, cursor):
        cursor.close()
        db.close()
        return {"error": "Room not found"}, 404
    cursor.execute(
        "SELECT id, name, x_norm, y_norm, ip_address, is_online FROM thermostat WHERE room_id = %s",
        (room_id,)
    )
    rows = cursor.fetchall()
    cursor.close()
    db.close()
    return {"thermostats": [dict(r) for r in rows]}, 200

def update_thermostat(thermostat_id: int, user_id: int, data: dict):
    allowed = {"name", "ip_address", "is_online", "x_norm", "y_norm"}
    fields = {k: v for k, v in data.items() if k in allowed}
    if not fields:
        return {"error": "No valid fields to update"}, 400
    db = get_db()
    cursor = db.cursor()
    if not _thermostat_belongs_to_user(thermostat_id, user_id, cursor):
        cursor.close()
        db.close()
        return {"error": "Thermostat not found"}, 404
    set_clause = ", ".join(f"{k} = %s" for k in fields)
    values = list(fields.values()) + [thermostat_id]
    cursor.execute(f"UPDATE thermostat SET {set_clause} WHERE id = %s", values)
    db.commit()
    cursor.close()
    db.close()
    return {"status": "ok"}, 200

def delete_thermostat(thermostat_id: int, user_id: int):
    db = get_db()
    cursor = db.cursor()
    if not _thermostat_belongs_to_user(thermostat_id, user_id, cursor):
        cursor.close()
        db.close()
        return {"error": "Thermostat not found"}, 404
    cursor.execute("DELETE FROM thermostat WHERE id = %s", (thermostat_id,))
    db.commit()
    cursor.close()
    db.close()
    return {"status": "ok"}, 200

# ── OBJECTS ───────────────────────────────────────────────

def add_object(room_id: int, user_id: int, obj_type: str, wall_side: str, wall_offset: float, is_open: bool):
    db = get_db()
    cursor = db.cursor()
    if not _room_belongs_to_user(room_id, user_id, cursor):
        cursor.close()
        db.close()
        return {"error": "Room not found"}, 404
    cursor.execute(
        """
        INSERT INTO object (room_id, type, wall_side, wall_offset, is_open)
        VALUES (%s, %s, %s, %s, %s) RETURNING id
        """,
        (room_id, obj_type.upper(), wall_side.lower(), wall_offset, is_open)
    )

def get_room_objects(room_id: int, user_id: int):
    db = get_db()
    cursor = db.cursor()
    if not _room_belongs_to_user(room_id, user_id, cursor):
        cursor.close()
        db.close()
        return {"error": "Room not found"}, 404
    cursor.execute(
        "SELECT id, type, wall_side, wall_offset, is_open FROM object WHERE room_id = %s",
        (room_id,)
    )
    rows = cursor.fetchall()
    cursor.close()
    db.close()
    return {"objects": [dict(r) for r in rows]}, 200