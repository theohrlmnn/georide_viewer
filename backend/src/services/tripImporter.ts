import { getTrips, getTripPositions } from './georideClient';
import { tripExists, insertTrip } from '../repositories/tripRepository';
import { insertTripPositions } from '../repositories/tripPositionsRepository';

export async function importTrips(trackerId: number, from: string, to: string) {
  const trips = await getTrips(trackerId, from, to);

  for (const trip of trips) {
    const exists = await tripExists(trip.id);
    if (exists) {
      console.log(`⚠️ Trip ${trip.id} déjà importé`);
      continue;
    }

    console.log(`➡️ Import du trip ${trip.id}`);
    await insertTrip(trip);

    const positions = await getTripPositions(trip.trackerId, trip.startTime, trip.endTime);
    await insertTripPositions(trip.id, positions);
  }
}
