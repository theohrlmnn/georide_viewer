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

    // Récupérer toutes les positions de la période
    const allPositions = await getTripPositions(trackerId, from, to);
    
    // Filtrer les positions qui appartiennent à ce trajet spécifique filtrer par timestamp
    const tripPositions = allPositions.filter((pos: any) => {
      const posTime = new Date(pos.fix_time).getTime();
      const tripStart = new Date(trip.startTime).getTime();
      const tripEnd = new Date(trip.endTime).getTime();
      
      // Inclure les positions qui sont dans la fenêtre du trajet (avec une marge de 1 minutes)
      const margin = 1 * 60 * 1000; // 1 minutes en millisecondes
      return posTime >= tripStart - margin && posTime <= tripEnd + margin;
    });

    // Trier par timestamp pour s'assurer de l'ordre chronologique
    tripPositions.sort((a: any, b: any) => 
      new Date(a.fix_time).getTime() - new Date(b.fix_time).getTime()
    );

    console.log(`📍 ${tripPositions.length} positions filtrées pour trip ${trip.id}`);
    await insertTripPositions(trip.id, tripPositions);
  }
}

export async function importSingleTrip(tripId: number) {
  // Vérifier si le trajet existe déjà
  const exists = await tripExists(tripId);
  if (exists) {
    throw new Error(`Le trajet ${tripId} est déjà importé`);
  }

  // Récupérer le trajet depuis GeoRide
  // Note: Cette fonction nécessite de connaître le trackerId et les dates
  // Pour l'instant, on utilise une approche simplifiée
  console.log(`➡️ Import du trip ${tripId}`);
  
  // TODO: Implémenter la récupération du trajet spécifique depuis GeoRide
  // Cela nécessite de modifier l'API GeoRide pour récupérer un trajet par ID
  throw new Error('Import de trajet individuel non encore implémenté - utilisez l\'import par période');
}
