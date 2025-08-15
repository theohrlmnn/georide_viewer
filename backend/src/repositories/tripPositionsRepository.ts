import pool from '../db';

export interface Position {
  fixtime: string;
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
          id, fixtime, latitude, longitude, speed, address, angle
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          tripId,
          pos.fixtime,
          pos.latitude,
          pos.longitude,
          pos.speed,
          pos.address,
          pos.angle
        ]
      );
    }

    await client.query('COMMIT');
    console.log(`✅ ${positions.length} positions insérées pour id=${tripId}`);
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
      fixtime,
      latitude,
      longitude,
      speed,
      address,
      angle
    FROM trip_positions
    WHERE id = $1
    ORDER BY fixtime ASC, id ASC
  `, [tripId]);

  // Double vérification côté application pour s'assurer de l'ordre
  const sortedPositions = res.rows.sort((a, b) => {
    const timeA = new Date(a.fixtime).getTime();
    const timeB = new Date(b.fixtime).getTime();
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    // Si même timestamp, utiliser l'ID pour un ordre stable
    return a.id - b.id;
  });

  return sortedPositions;
}

export async function tripHasPositions(tripId: number): Promise<boolean> {
  const res = await pool.query(
    'SELECT COUNT(*) as count FROM trip_positions WHERE id = $1',
    [tripId]
  );
  return parseInt(res.rows[0].count) > 0;
}
