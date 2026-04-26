import requests
from datetime import datetime, timedelta
import random
import math

BASE_URL = "https://c615-109-166-136-76.ngrok-free.app"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImlyaW5hIiwiZXhwIjoxNzc3MjEzMzc4fQ.JoBvjW2PaaE9OSKX1sw-A-BaziDerBr4t8LAnDLokH8"
ROOM_ID = 3
THERMOSTAT_ID = 2

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true"
}

# ── STEP 1: Create sockets SKT_01 to SKT_20 ──────────────────────────────────

def create_sockets():
    print("Creating sockets SKT_01 to SKT_20...")
    created = []

    for i in range(1, 21):
        name = f"SKT_{i:02d}"
        # spread them across the room in a grid-like pattern
        col = (i - 1) % 5
        row = (i - 1) // 5
        x_norm = round(0.1 + col * 0.2, 2)
        y_norm = round(0.2 + row * 0.2, 2)
        ip = f"192.168.1.{100 + i}"

        payload = {
            "name": name,
            "x_norm": x_norm,
            "y_norm": y_norm,
            "ip_address": ip
        }

        resp = requests.post(
            f"{BASE_URL}/rooms/{ROOM_ID}/sockets",
            json=payload,
            headers=HEADERS
        )

        if resp.status_code == 201:
            socket_id = resp.json().get("socket_id")
            print(f"  ✓ {name} created → socket_id {socket_id}")
            created.append({"name": name, "socket_id": socket_id})
        else:
            print(f"  ✗ {name} failed: {resp.status_code} {resp.text}")

    return created

# ── STEP 2: Generate timestamps ───────────────────────────────────────────────

def generate_timestamps():
    start = datetime(2026, 4, 25, 12, 0, 0)
    end   = datetime(2026, 4, 25, 18, 0, 0)
    timestamps = []
    current = start
    while current <= end:
        timestamps.append(current)
        current += timedelta(minutes=5)
    return timestamps

# ── STEP 3: Generate realistic kwh per socket ─────────────────────────────────

def generate_kwh(socket_index: int, timestamp: datetime) -> float:
    hour = timestamp.hour + timestamp.minute / 60
    # base load varies per socket
    base = 0.03 + socket_index * 0.002
    # sine wave to simulate usage patterns peaking around 14:00
    wave = 0.02 * math.sin(math.pi * (hour - 12) / 6)
    # random noise
    noise = random.uniform(-0.005, 0.005)
    # occasional spike (wasteful) for some sockets
    spike = 0.0
    if socket_index % 7 == 0 and 14 <= hour <= 15:
        spike = random.uniform(0.08, 0.15)
    return round(max(0.001, base + wave + noise + spike), 6)

# ── STEP 4: Generate realistic thermostat data ────────────────────────────────

def generate_thermostat(timestamp: datetime):
    hour = timestamp.hour + timestamp.minute / 60
    # temperature rises through the day
    temp = 20.0 + 3.0 * math.sin(math.pi * (hour - 10) / 8) + random.uniform(-0.3, 0.3)
    humidity = 45.0 + 5.0 * math.sin(math.pi * (hour - 12) / 6) + random.uniform(-1, 1)
    return round(temp, 2), round(humidity, 2)

# ── STEP 5: Post all data ─────────────────────────────────────────────────────

def post_socket_data(socket_id: int, kwh: float, ts: datetime):
    payload = {
        "socket_id": socket_id,
        "kwh": kwh,
        "ts": ts.strftime("%Y-%m-%d %H:%M:%S")
    }
    resp = requests.post(
        f"{BASE_URL}/data/socket",
        json=payload,
        headers=HEADERS
    )
    return resp.status_code == 200

def post_thermostat_data(temp: float, humidity: float, ts: datetime):
    payload = {
        "thermostat_id": THERMOSTAT_ID,
        "temp_ambient": temp,
        "humidity": humidity,
        "ts": ts.strftime("%Y-%m-%d %H:%M:%S")
    }
    resp = requests.post(
        f"{BASE_URL}/data/thermostat",
        json=payload,
        headers=HEADERS
    )
    return resp.status_code == 200

# ── MAIN ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":

    # Step 1 — create sockets
    sockets = create_sockets()
    if not sockets:
        print("No sockets created, exiting.")
        exit(1)

    print(f"\n✓ Created {len(sockets)} sockets\n")

    # Step 2 — generate timestamps
    timestamps = generate_timestamps()
    print(f"Posting data for {len(timestamps)} timestamps × {len(sockets)} sockets + thermostat...\n")

    total_socket_ok = 0
    total_socket_fail = 0
    total_thermo_ok = 0
    total_thermo_fail = 0

    for ts in timestamps:
        ts_str = ts.strftime("%Y-%m-%d %H:%M:%S")

        # post each socket
        for idx, socket in enumerate(sockets):
            kwh = generate_kwh(idx, ts)
            ok = post_socket_data(socket["socket_id"], kwh, ts)
            if ok:
                total_socket_ok += 1
            else:
                total_socket_fail += 1
                print(f"  ✗ socket {socket['name']} at {ts_str} failed")

        # post thermostat
        temp, humidity = generate_thermostat(ts)
        ok = post_thermostat_data(temp, humidity, ts)
        if ok:
            total_thermo_ok += 1
        else:
            total_thermo_fail += 1
            print(f"  ✗ thermostat at {ts_str} failed")

        print(f"  ✓ {ts_str} done")

    print(f"""
Done.
  Sockets:    {total_socket_ok} ok, {total_socket_fail} failed
  Thermostat: {total_thermo_ok} ok, {total_thermo_fail} failed
""")