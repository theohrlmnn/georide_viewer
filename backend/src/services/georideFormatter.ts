import { getTripPositions } from './georideClient'; // adapte selon ton arborescence

/**
 * Génère un objet GeoJSON LineString à partir d’un trajet Georide
 * @param trip L’objet "trip" tel que retourné par getTrips()
 * @returns {Promise<GeoJSON.Feature>} Un objet GeoJSON LineString avec les points du trajet
 */
export async function getTripGeoJSON(trip: {
  trackerId: number;
  startTime: string;
  endTime: string;
  id: number;
}) {
  const positions = await getTripPositions(trip.trackerId, trip.startTime, trip.endTime);

  const coordinates = positions.map((p: any) => [p.longitude, p.latitude]);

  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates,
    },
    properties: {
      tripId: trip.id,
      trackerId: trip.trackerId,
      startTime: trip.startTime,
      endTime: trip.endTime,
    },
  };
}
