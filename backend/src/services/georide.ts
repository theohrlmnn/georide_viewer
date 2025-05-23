import fetch from 'node-fetch';
import logger from '../utils/logger';

const GEORIDE_API_TOKEN = process.env.GEORIDE_API_TOKEN;
const BASE_URL = 'https://api.georide.com';


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
