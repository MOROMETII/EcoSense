-- Table for thermostats (for get_thermostat_status)
CREATE TABLE thermostat (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    is_online BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for temperature/humidity readings (for save_thermostat_reading)
CREATE TABLE data_thermostat (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thermostat_id INTEGER NOT NULL,
    temp_ambient REAL NOT NULL,
    humidity REAL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (thermostat_id) REFERENCES thermostat(id) ON DELETE CASCADE
);

-- Optional: Create index for faster lookups by thermostat_id
CREATE INDEX idx_data_thermostat_thermostat_id ON data_thermostat(thermostat_id);

-- Optional: Create index for timestamp queries
CREATE INDEX idx_data_thermostat_recorded_at ON data_thermostat(recorded_at);