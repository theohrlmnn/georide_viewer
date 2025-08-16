import pool from "./index";

export async function initDb() {
  const createTripsTable = `
    CREATE TABLE IF NOT EXISTS trips (
      id INT PRIMARY KEY,
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
        idTrip INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        fixtime TIMESTAMPTZ,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        speed FLOAT,
        address TEXT,
        angle FLOAT
      );
    `;

  const createIndexes = `
    CREATE INDEX IF NOT EXISTS idx_trip_positions_id ON trip_positions(id);
    CREATE INDEX IF NOT EXISTS idx_trip_positions_fixtime ON trip_positions(fixtime);
    CREATE INDEX IF NOT EXISTS idx_trip_positions_trip_time ON trip_positions(id, fixtime);
  `;

  try {
    await pool.query(createTripsTable);
    await pool.query(createTripPositions);
    await pool.query(createIndexes);
    console.log('✅ Tables vérifiées / créées');
    console.log('✅ Index créés pour les performances');
  } catch (err) {
    console.error('❌ Erreur lors de l’initialisation de la base :', err);
    throw err;
  }
}
