import fetch from 'node-fetch';
import logger from '../utils/logger';

const GEORIDE_API_TOKEN = process.env.GEORIDE_API_TOKEN;
const BASE_URL = 'https://api.georide.com';

/**
 * Récupère les trajets d'un tracker
 * @param trackerId ID du tracker
 * @param from Date de début au format ISO 8601 
 * @param to Date de fin au format ISO 8601
 * @returns {Promise<any>} Les trajets du tracker
 * @throws {Error} Si la requête échoue
 * @description
 * Cette fonction récupère les trajets d'un tracker à partir de l'API GeoRide.
 * Elle utilise le token d'API GeoRide pour s'authentifier.
 * Si la requête échoue, elle lance une erreur avec le code d'état de la réponse.
 * @example
 * const trips = await getTrips(123, '2023-01-01T00:00:00Z', '2023-01-02T00:00:00Z');
 */
export async function getTrips(trackerId: number, from: string, to: string) {
  const url = `${BASE_URL}/tracker/${trackerId}/trips?from=${from}&to=${to}`;
  logger.info(`Fetching trips from GeoRide API: ${url}`);
  const res = await fetch(url, {
    headers: {
      Authorization: GEORIDE_API_TOKEN ? `Bearer ${GEORIDE_API_TOKEN}` : '',
    },
  });

  if (!res.ok) throw new Error(`GeoRide API error: ${res.status}`);
  return res.json();
}

/**
 * Récupère les positions d'un trajet
 * @param trackerId ID du tracker
 * @param from Date de début au format ISO 8601 
 * @param to Date de fin au format ISO 8601
 * @returns {Promise<any>} Les positions du trajet
 * @throws {Error} Si la requête échoue
 * @description
 * Cette fonction récupère les positions d'un trajet à partir de l'API GeoRide.
 * Elle utilise le token d'API GeoRide pour s'authentifier.
 * Si la requête échoue, elle lance une erreur avec le code d'état de la réponse.
 * @example
 * const positions = await getTripPositions(123, '2023-01-01T00:00:00Z', '2023-01-02T00:00:00Z');
 */
export async function getTripPositions(trackerId: number, from: string, to: string) {
  const url = `${BASE_URL}/tracker/${trackerId}/trips/positions?from=${from}&to=${to}`;
  const res = await fetch(url, {
    headers: {
      Authorization: GEORIDE_API_TOKEN ? `Bearer ${GEORIDE_API_TOKEN}` : '',
    },
  });
  if (!res.ok) throw new Error(`GeoRide API error: ${res.status}`);
  return res.json(); // retourne positions[]
}

/**
 * Récupère les informations du tracker
 * @returns {Promise<any>} Les informations du tracker
 * @throws {Error} Si la requête échoue
 * @description
 * Cette fonction récupère les informations du tracker à partir de l'API GeoRide.
 * Elle utilise le token d'API GeoRide pour s'authentifier.
 * Si la requête échoue, elle lance une erreur avec le code d'état de la réponse.
 * @example
 * const trackerInfo = await getTracker();
 */
export async function getTracker(){
  const url = `${BASE_URL}/user/tracker`;
  const res = await fetch(url, {
    headers: {
      Authorization: GEORIDE_API_TOKEN ? `Bearer ${GEORIDE_API_TOKEN}` : '',
    },
  });
  if (!res.ok) throw new Error(`GeoRide API error: ${res.status}`);
  return res.json(); // retourne information tracker
}