import sqlite3
import os

def _ensure_schema(conn: sqlite3.Connection) -> None:
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS thermostat (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            is_online BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS data_thermostat (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            thermostat_id INTEGER NOT NULL,
            temp_ambient REAL NOT NULL,
            humidity REAL,
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (thermostat_id) REFERENCES thermostat(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_data_thermostat_thermostat_id
            ON data_thermostat(thermostat_id);
        CREATE INDEX IF NOT EXISTS idx_data_thermostat_recorded_at
            ON data_thermostat(recorded_at);
        """
    )

# db connection for each thread
def get_db():
    db_path = os.path.join(os.path.dirname(__file__), "database.db")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    _ensure_schema(conn)
    return conn