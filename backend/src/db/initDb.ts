import pool from "./index";

export async function initDb() {
  const createTripsTable = `
    CREATE TABLE IF NOT EXISTS trips (
      id SERIAL PRIMARY KEY,
      tracker_id INTEGER NOT NULL,
      georide_trip_id INTEGER NOT NULL UNIQUE,
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP NOT NULL,
      distance INTEGER,
      average_speed REAL,
      max_speed REAL,
      start_address TEXT,
      end_address TEXT
    );
  `;

  try {
    await pool.query(createTripsTable);
    console.log('✅ Table "trips" vérifiée / créée');
  } catch (err) {
    console.error('❌ Erreur lors de l’initialisation de la base :', err);
    throw err;
  }
}
