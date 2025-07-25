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
      trip_id, tracker_id, start_time, end_time,
      start_lat, start_lon, end_lat, end_lon,
      distance, average_speed, max_speed, duration,
      start_address, end_address, static_image,
      max_angle, max_left_angle, max_right_angle, average_angle, raw
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

export async function getAllTrips(): Promise<Trip[]> {
  const res = await pool.query(`
    SELECT
      trip_id AS id,
      tracker_id,
      start_time,
      end_time,
      start_lat,
      start_lon,
      end_lat,
      end_lon,
      distance,
      average_speed,
      max_speed,
      duration,
      start_address,
      end_address,
      static_image,
      max_angle,
      max_left_angle,
      max_right_angle,
      average_angle
    FROM trips
    ORDER BY start_time DESC;
  `);
  return res.rows;
}

export async function getTripById(tripId: number): Promise<Trip | null> {
  const res = await pool.query(`
    SELECT
      trip_id AS id,
      tracker_id,
      start_time,
      end_time,
      start_lat,
      start_lon,
      end_lat,
      end_lon,
      distance,
      average_speed,
      max_speed,
      duration,
      start_address,
      end_address,
      static_image,
      max_angle,
      max_left_angle,
      max_right_angle,
      average_angle
    FROM trips
    WHERE trip_id = $1;
  `, [tripId]);

  if (res.rowCount === 0) return null;
  return res.rows[0];
}

export async function deleteTripById(tripId: number): Promise<void> {
  await pool.query('DELETE FROM trips WHERE trip_id = $1', [tripId]);
}