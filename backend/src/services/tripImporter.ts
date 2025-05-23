// src/services/tripImporter.ts
import { getTrips, getTripPositions } from './georide';
import pool from '../db';
import logger from '../utils/logger';
import { log } from 'console';


/**
 * Récupère les trajets d'un tracker et les insère dans la base de données
 * @param trackerId ID du tracker
 * @param from Date de début au format ISO 8601
 * @param to Date de fin au format ISO 8601
 * @returns {Promise<any>} Les trajets importés
 * @throws {Error} Si la requête échoue ou si la réponse ne contient pas de tableau
 * @description
 * Cette fonction récupère les trajets d'un tracker à partir de l'API GeoRide
 * et les insère dans la base de données.
 * Elle utilise le token d'API GeoRide pour s'authentifier.
 * Si la requête échoue, elle lance une erreur avec le code d'état de la réponse.
 * Si la réponse ne contient pas de tableau, elle lance une erreur.
 * @example
 * const trips = await importTrips(123, '2023-01-01T00:00:00Z', '2023-01-02T00:00:00Z');
 */
export async function importTrips(trackerId: number, from: string, to: string) {
  const tripsResponse = await getTrips(trackerId, from, to);

  // Adapte la ligne suivante selon la structure réelle
  const trips = Array.isArray(tripsResponse) ? tripsResponse : tripsResponse.trips;
  logger.info(`Nombre de trips: ${Array.isArray(trips) ? trips.length : 0}`);
  if (!Array.isArray(trips)) {
    throw new Error('La réponse de getTrips ne contient pas de tableau trips');
  }
  for (const trip of trips) {
    const { startTime, endTime } = trip;
    const positionsResponse = await getTripPositions(trackerId, startTime, endTime);
    //logger.info({ positionsResponse }, 'Réponse brute de getTripPositions');
    // Adapte cette ligne selon la structure réelle
    const positions = Array.isArray(positionsResponse)
      ? positionsResponse
      : positionsResponse.positions;

    if (!Array.isArray(positions)) {
      throw new Error('La réponse de getTripPositions ne contient pas de tableau positions');
    }


    // Insertion du trajet principal
    await pool.query(
      `INSERT INTO trips (
      trip_id, tracker_id, start_time, end_time,
      start_lat, start_lon, end_lat, end_lon,
      distance, average_speed, max_speed, duration,
      start_address, end_address, static_image,
      max_angle, max_left_angle, max_right_angle, average_angle
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
      [
        trip.id,
        trackerId,
        trip.startTime,
        trip.endTime,
        trip.startLat,
        trip.startLon,
        trip.endLat,
        trip.endLon,
        trip.distance,
        trip.averageSpeed,
        trip.max_speed,
        trip.duration,
        trip.start_address,
        trip.end_address,
        trip.static_image,
        trip.max_angle,
        trip.max_left_angle,
        trip.max_right_angle,
        trip.average_angle,
        //JSON.stringify(trip), // enregistrement brut
      ]
    );
    logger.info(`Trajet inséré: ${trip.id}`);
    // Insertion des positions liées à ce trajet
    for (const pos of positions) {
      await pool.query(
        `INSERT INTO trip_positions (
        trip_id, fix_time, latitude, longitude, speed, address, angle
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          trip.id,
          pos.fixtime,
          pos.latitude,
          pos.longitude,
          pos.speed,
          pos.address,
          pos.angle,
        ]
      );
    }
  }
  logger.info('Importation des trajets terminée');
  return trips;
}