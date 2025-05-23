CREATE TABLE trips (
    trip_id INT PRIMARY KEY,
    tracker_id INT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    start_lat DOUBLE PRECISION,
    start_lon DOUBLE PRECISION,
    end_lat DOUBLE PRECISION,
    end_lon DOUBLE PRECISION,
    distance INT,
    average_speed FLOAT,
    max_speed FLOAT,
    duration INT,
    start_address TEXT,
    end_address TEXT,
    static_image TEXT,
    max_angle FLOAT,
    max_left_angle FLOAT,
    max_right_angle FLOAT,
    average_angle FLOAT,
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
