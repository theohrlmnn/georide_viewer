import pool from "./index";

export async function initDb() {
  const createTripsTable = `
    CREATE TABLE IF NOT EXISTS trips (
      trip_id INT PRIMARY KEY,
      trackerId INT NOT NULL,
      startTime TIMESTAMPTZ NOT NULL,
      endTime TIMESTAMPTZ NOT NULL,
      startLat DOUBLE PRECISION,
      startLon DOUBLE PRECISION,
      endLat DOUBLE PRECISION,
      endLon DOUBLE PRECISION,
      distance BIGINT,
      averageSpeed FLOAT,
      maxSpeed FLOAT,
      duration BIGINT,
      startAddress TEXT,
      endAddress TEXT,
      staticImage TEXT,
      maxAngle FLOAT,
      maxLeftAngle FLOAT,
      maxRightAngle FLOAT,
      averageAngle FLOAT,
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
