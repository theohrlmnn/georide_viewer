import pool from "./index";

export async function initDb() {
  const createTripsTable = `
    CREATE TABLE IF NOT EXISTS trips (
      trip_id INT PRIMARY KEY,
      tracker_id INT NOT NULL,
      start_time TIMESTAMPTZ NOT NULL,
      end_time TIMESTAMPTZ NOT NULL,
      start_lat DOUBLE PRECISION,
      start_lon DOUBLE PRECISION,
      end_lat DOUBLE PRECISION,
      end_lon DOUBLE PRECISION,
      distance BIGINT,
      average_speed FLOAT,
      max_speed FLOAT,
      duration BIGINT,
      start_address TEXT,
      end_address TEXT,
      static_image TEXT,
      max_angle FLOAT,
      max_left_angle FLOAT,
      max_right_angle FLOAT,
      average_angle FLOAT,
      raw JSONB
    );`;
    const createTripPositions = `
      CREATE TABLE IF NOT EXISTS trip_positions (
        id SERIAL PRIMARY KEY,
        trip_id INT NOT NULL REFERENCES trips(trip_id) ON DELETE CASCADE,
        fix_time TIMESTAMPTZ,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        speed FLOAT,
        address TEXT,
        angle FLOAT
      );
    `;

  try {
    await pool.query(createTripsTable);
    await pool.query(createTripPositions);
    console.log('✅ Table "trips" vérifiée / créée');
  } catch (err) {
    console.error('❌ Erreur lors de l’initialisation de la base :', err);
    throw err;
  }
}
