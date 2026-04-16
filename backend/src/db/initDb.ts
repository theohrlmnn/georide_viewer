import pool from "./index";

export async function initDb() {
  // Activer l'extension PostGIS
  const enablePostGIS = `CREATE EXTENSION IF NOT EXISTS postgis;`;
  
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
      raw JSONB,
      -- Géométrie PostGIS pour le point de départ et d'arrivée
      startGeom GEOMETRY(POINT, 4326),
      endGeom GEOMETRY(POINT, 4326),
      -- Géométrie pour la trajectoire complète (LineString)
      routeGeom GEOMETRY(LINESTRING, 4326)
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
        angle FLOAT,
        -- Géométrie PostGIS pour chaque position
        geom GEOMETRY(POINT, 4326)
      );
    `;

  const createIndexes = `
    CREATE INDEX IF NOT EXISTS idx_trip_positions_idtrip ON trip_positions(idTrip);
    CREATE INDEX IF NOT EXISTS idx_trip_positions_fixtime ON trip_positions(fixtime);
    CREATE INDEX IF NOT EXISTS idx_trip_positions_trip_time ON trip_positions(idTrip, fixtime);
  `;

  // Index GIST pour les géométries PostGIS
  const createGistIndexes = `
    -- Index GIST sur les géométries des trajets
    CREATE INDEX IF NOT EXISTS idx_trips_start_geom ON trips USING GIST(startGeom);
    CREATE INDEX IF NOT EXISTS idx_trips_end_geom ON trips USING GIST(endGeom);
    CREATE INDEX IF NOT EXISTS idx_trips_route_geom ON trips USING GIST(routeGeom);
    
    -- Index GIST sur les positions
    CREATE INDEX IF NOT EXISTS idx_trip_positions_geom ON trip_positions USING GIST(geom);
  `;

  const createTripGroups = `
    CREATE TABLE IF NOT EXISTS trip_groups (
      id        SERIAL PRIMARY KEY,
      name      TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS trip_group_members (
      group_id INT NOT NULL REFERENCES trip_groups(id) ON DELETE CASCADE,
      trip_id  INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      PRIMARY KEY (group_id, trip_id)
    );

    CREATE INDEX IF NOT EXISTS idx_tgm_group ON trip_group_members(group_id);
    CREATE INDEX IF NOT EXISTS idx_tgm_trip  ON trip_group_members(trip_id);
  `;

  // Séquence dédiée aux imports GPX (IDs négatifs pour ne jamais entrer en collision
  // avec les IDs positifs attribués par l'API GeoRide)
  const createGpxSequence = `
    CREATE SEQUENCE IF NOT EXISTS gpx_trip_id_seq START WITH -1 INCREMENT BY -1;
  `;

  try {
    // 1. Activer PostGIS en premier
    await pool.query(enablePostGIS);
    console.log('✅ Extension PostGIS activée');

    // 2. Créer les tables avec les colonnes géométriques
    await pool.query(createTripsTable);
    await pool.query(createTripPositions);
    console.log('✅ Tables vérifiées / créées avec colonnes PostGIS');

    // 3. Créer les index classiques
    await pool.query(createIndexes);
    console.log('✅ Index classiques créés');

    // 4. Créer les index GIST pour les géométries
    await pool.query(createGistIndexes);
    console.log('✅ Index GIST PostGIS créés pour les performances spatiales');

    // 5. Tables de groupes de trajets
    await pool.query(createTripGroups);
    console.log('✅ Tables trip_groups / trip_group_members vérifiées / créées');

    // 6. Séquence IDs GPX
    await pool.query(createGpxSequence);
    console.log('✅ Séquence gpx_trip_id_seq vérifiée / créée');

  } catch (err) {
    console.error('❌ Erreur lors de l\'initialisation de la base :', err);
    throw err;
  }
}
