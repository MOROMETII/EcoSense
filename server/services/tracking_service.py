from db import get_db

def save_thermostat_reading(thermostat_id: int, temp_ambient: float, humidity: float = None, ts: str = None):
    db = get_db()
    cursor = db.cursor()
    if ts:
        cursor.execute(
            """
            INSERT INTO data_thermostat (thermostat_id, temp_ambient, humidity, ts)
            VALUES (%s, %s, %s, %s)
            """,
            (thermostat_id, temp_ambient, humidity, ts)
        )
    else:
        cursor.execute(
            """
            INSERT INTO data_thermostat (thermostat_id, temp_ambient, humidity)
            VALUES (%s, %s, %s)
            """,
            (thermostat_id, temp_ambient, humidity)
        )
    db.commit()
    cursor.close()
    db.close()

#
# get last 24h history (default)
#GET /data/thermostat/1

# get last 6h history
#GET /data/thermostat/1?hours=6
#

def get_thermostat_history(thermostat_id: int, hours: int = 24):
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        """
        SELECT temp_ambient, humidity, ts
        FROM data_thermostat
        WHERE thermostat_id = %s
          AND ts > NOW() - INTERVAL '%s hours'
        ORDER BY ts ASC
        """,
        (thermostat_id, hours)
    )
    rows = cursor.fetchall()
    cursor.close()
    db.close()
    return [dict(row) for row in rows]

def get_thermostat_status(thermostat_id: int):
    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        "SELECT is_online FROM thermostat WHERE id = %s",
        (thermostat_id,)
    )
    row = cursor.fetchone()
    cursor.close()
    db.close()

    if not row:
        return {"error": "Thermostat not found"}, 404

    return {"status": 1 if row["is_online"] else 0}, 200

def save_socket_reading(socket_id: int, kwh: float, ts: str = None):
    db = get_db()
    cursor = db.cursor()
    if ts:
        cursor.execute(
            "INSERT INTO data_socket (socket_id, kwh, ts) VALUES (%s, %s, %s)",
            (socket_id, kwh, ts)
        )
    else:
        cursor.execute(
            "INSERT INTO data_socket (socket_id, kwh) VALUES (%s, %s)",
            (socket_id, kwh)
        )
    db.commit()
    cursor.close()
    db.close()

def get_socket_history(socket_id: int, hours: int = 6):
    # boilerplate — replace with real query later
    return []