import pool from '../db';

export interface Position {
  fix_time: string;
  latitude: number;
  longitude: number;
  speed: number;
  address: string;
  angle: number;
}

export async function insertTripPositions(tripId: number, positions: Position[]) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const pos of positions) {
      await client.query(
        `INSERT INTO trip_positions (
          trip_id, fix_time, latitude, longitude, speed, address, angle
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          tripId,
          pos.fix_time,
          pos.latitude,
          pos.longitude,
          pos.speed,
          pos.address,
          pos.angle
        ]
      );
    }

    await client.query('COMMIT');
    console.log(`✅ ${positions.length} positions insérées pour trip_id=${tripId}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur lors de l’insertion des positions :', err);
    throw err;
  } finally {
    client.release();
  }
}

export async function getPositionsByTripId(tripId: number): Promise<any[]> {
  const res = await pool.query(`
    SELECT
      fix_time,
      latitude,
      longitude,
      speed,
      address,
      angle
    FROM trip_positions
    WHERE trip_id = $1
    ORDER BY fix_time ASC, id ASC
  `, [tripId]);

  // Double vérification côté application pour s'assurer de l'ordre
  const sortedPositions = res.rows.sort((a, b) => {
    const timeA = new Date(a.fix_time).getTime();
    const timeB = new Date(b.fix_time).getTime();
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    // Si même timestamp, utiliser l'ID pour un ordre stable
    return a.id - b.id;
  });

  return sortedPositions;
}
