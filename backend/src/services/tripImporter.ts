import { getTrips, getTripPositions } from './georideClient';
import { tripExists, insertTrip } from '../repositories/tripRepository';
import { insertTripPositions, tripHasPositions } from '../repositories/tripPositionsRepository';

export async function importTrips(trackerId: number, from: string, to: string) {
  const trips = await getTrips(trackerId, from, to);
  
  // Récupérer toutes les positions UNE SEULE FOIS pour éviter le rate limiting
  console.log(`📍 Récupération des positions pour la période ${from} - ${to}`);
  let allPositions: any[] = [];
  
  try {
    const rawPositions = await getTripPositions(trackerId, from, to);
    console.log(`📍 ${rawPositions.length} positions brutes récupérées au total`);
    
    // Debug: Afficher la structure de la première position brute
    if (rawPositions.length > 0) {
      console.log('🔍 Structure de la première position brute:', JSON.stringify(rawPositions[0], null, 2));
    }
    
    // Normaliser les positions avec le bon nom de champ
    allPositions = rawPositions.map((p: any) => ({
      fixtime: p.fixtime, // ← Le vrai nom du champ !
      latitude: p.latitude,
      longitude: p.longitude,
      speed: p.speed,
      address: p.address,
      angle: p.angle,
    }));
    
    console.log(`📍 ${allPositions.length} positions normalisées`);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des positions:', error);
    // Continuer l'import des trajets même sans positions
  }

  for (const trip of trips) {
    const exists = await tripExists(trip.id);
    const hasPositions = exists ? await tripHasPositions(trip.id) : false;
    
    if (exists && hasPositions) {
      console.log(`⚠️ Trip ${trip.id} déjà importé avec positions`);
      continue;
    }

    if (exists && !hasPositions) {
      console.log(`🔄 Trip ${trip.id} existe mais sans positions - import des positions`);
    } else {
      console.log(`➡️ Import du trip ${trip.id}`);
      await insertTrip(trip);
    }

    if (allPositions.length > 0) {
      // Debug: Afficher les timestamps pour comprendre le problème
      console.log(`🔍 Debug trip ${trip.id}:`);
      console.log(`   Trip start: ${trip.startTime}`);
      console.log(`   Trip end: ${trip.endTime}`);
      console.log(`   Première position: ${allPositions[0]?.fixtime}`);
      console.log(`   Dernière position: ${allPositions[allPositions.length - 1]?.fixtime}`);
      
      // Filtrer les positions qui appartiennent à ce trajet spécifique
      const tripPositions = allPositions.filter((pos: any) => {
        const posTime = new Date(pos.fixtime).getTime();
        const tripStart = new Date(trip.startTime).getTime();
        const tripEnd = new Date(trip.endTime).getTime();
        
        // Inclure les positions qui sont dans la fenêtre du trajet (avec une marge de 10 minutes)
        const margin = 10 * 60 * 1000; // 10 minutes en millisecondes (augmenté pour debug)
        const isInRange = posTime >= tripStart - margin && posTime <= tripEnd + margin;
        
        // Debug: afficher quelques positions pour voir le filtrage
        if (allPositions.indexOf(pos) < 3) {
          console.log(`   Position ${pos.fixtime}: ${isInRange ? '✅' : '❌'} (${posTime} vs ${tripStart}-${tripEnd})`);
        }
        
        return isInRange;
      });

      // Trier par timestamp pour s'assurer de l'ordre chronologique
      tripPositions.sort((a: any, b: any) => 
        new Date(a.fixtime).getTime() - new Date(b.fixtime).getTime()
      );

      console.log(`📍 ${tripPositions.length} positions filtrées pour trip ${trip.id}`);
      
      if (tripPositions.length > 0) {
        await insertTripPositions(trip.id, tripPositions);
      } else {
        console.log(`⚠️ Aucune position trouvée pour trip ${trip.id}`);
      }
    } else {
      console.log(`⚠️ Import du trip ${trip.id} sans positions (erreur API)`);
    }
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
