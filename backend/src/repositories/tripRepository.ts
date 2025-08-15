import pool from '../db';
import { Trip } from '../types';

export async function tripExists(tripId: number): Promise<boolean> {
  const res = await pool.query(
    'SELECT 1 FROM trips WHERE trip_id = $1 LIMIT 1',
    [tripId]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function insertTrip(trip: Trip): Promise<void> {
  await pool.query(
    `INSERT INTO trips (
      trip_id, trackerId, startTime, endTime,
      startLat, startLon, endLat, endLon,
      distance, averageSpeed, maxSpeed, duration,
      startAddress, endAddress, staticImage,
      maxAngle, maxLeftAngle, maxRightAngle, averageAngle, raw
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7, $8,
      $9, $10, $11, $12,
      $13, $14, $15,
      $16, $17, $18, $19, $20
    )`,
    [
      trip.id,
      trip.trackerId,
      trip.startTime,
      trip.endTime,
      trip.startLat,
      trip.startLon,
      trip.endLat,
      trip.endLon,
      trip.distance,
      trip.averageSpeed,
      trip.maxSpeed,
      trip.duration,
      trip.startAddress,
      trip.endAddress,
      trip.staticImage,
      trip.maxAngle,
      trip.maxLeftAngle,
      trip.maxRightAngle,
      trip.averageAngle,
      JSON.stringify(trip) // stockage JSON brut
    ]
  );
}

export async function getAllTrips(from?: string, to?: string): Promise<Trip[]> {
  let query = `
    SELECT
      trip_id AS id,
      trackerId,
      startTime,
      endTime,
      startLat,
      startLon,
      endLat,
      endLon,
      distance,
      averageSpeed,
      maxSpeed,
      duration,
      startAddress,
      endAddress,
      staticImage,
      maxAngle,
      maxLeftAngle,
      maxRightAngle,
      averageAngle
    FROM trips
  `;
  
  const params: any[] = [];
  let paramIndex = 1;
  
  if (from || to) {
    query += ' WHERE ';
    const conditions: string[] = [];
    
    if (from) {
      conditions.push(`startTime >= $${paramIndex}`);
      params.push(from);
      paramIndex++;
    }
    
    if (to) {
      conditions.push(`endTime <= $${paramIndex}`);
      params.push(to);
      paramIndex++;
    }
    
    query += conditions.join(' AND ');
  }
  
  query += ' ORDER BY startTime DESC';
  
  const res = await pool.query(query, params);
  
  // Plus besoin de conversion, la DB est déjà en camelCase
  return res.rows;
}

export async function getTripById(tripId: number): Promise<Trip | null> {
  const res = await pool.query(`
    SELECT
      trip_id AS id,
      trackerId,
      startTime,
      endTime,
      startLat,
      startLon,
      endLat,
      endLon,
      distance,
      averageSpeed,
      maxSpeed,
      duration,
      startAddress,
      endAddress,
      staticImage,
      maxAngle,
      maxLeftAngle,
      maxRightAngle,
      averageAngle
    FROM trips
    WHERE trip_id = $1;
  `, [tripId]);

  if (res.rowCount === 0) return null;
  
  // Plus besoin de conversion, la DB est déjà en camelCase
  return res.rows[0];
}

export async function deleteTripById(tripId: number): Promise<void> {
  await pool.query('DELETE FROM trips WHERE trip_id = $1', [tripId]);
}