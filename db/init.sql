CREATE TABLE trips (
    trip_id INT PRIMARY KEY,
    trackerId INT,
    startTime TIMESTAMP,
    endTime TIMESTAMP,
    startLat DOUBLE PRECISION,
    startLon DOUBLE PRECISION,
    endLat DOUBLE PRECISION,
    endLon DOUBLE PRECISION,
    distance INT,
    averageSpeed FLOAT,
    maxSpeed FLOAT,
    duration INT,
    startAddress TEXT,
    endAddress TEXT,
    staticImage TEXT,
    maxAngle FLOAT,
    maxLeftAngle FLOAT,
    maxRightAngle FLOAT,
    averageAngle FLOAT,
    raw JSONB
);

CREATE TABLE trip_positions (
    id SERIAL PRIMARY KEY,
    trip_id INT,
    fix_time TIMESTAMP,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    speed FLOAT,
    address TEXT,
    angle FLOAT
);

-- Index pour améliorer les performances de tri et de filtrage
CREATE INDEX IF NOT EXISTS idx_trip_positions_trip_id ON trip_positions(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_positions_fix_time ON trip_positions(fix_time);
CREATE INDEX IF NOT EXISTS idx_trip_positions_trip_time ON trip_positions(trip_id, fix_time);
