import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { initDb } from './db/initDb';
import pool from './db/index';
import { importTrips, importSingleTrip } from './services/tripImporter';
import { getAllTrips, getTripById, deleteTripById } from './repositories/tripRepository';
import { getPositionsByTripId } from './repositories/tripPositionsRepository';
import { getTrips } from './services/georideClient';

import { GeorideProvider } from './providers/georideProvider'
import { LocalProvider } from './providers/localProvider'
import { listTrips, getTripGeoJSON } from './services/tripService'
import { SpatialQueries } from './utils/geometryUtils'
import { getCacheStats, clearGeoRideCache } from './services/georideCache'
import helmet from 'helmet'
dotenv.config();



const app = express();
const port = process.env.PORT || 4000;

app.use(helmet())
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

// Health check endpoint pour Docker
app.get('/health', async (req, res) => {
  try {
    // Vérifier la connexion à la base de données
    await pool.query('SELECT 1')
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected'
    })
  } catch (error: any) {
    res.status(503).json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error?.message || String(error)
    })
  }
})

// GET /georide/trips?trackerId=2055973&from=ISO&to=ISO
app.get('/georide/trips', async (req: Request, res: Response) => {
  try {
    const trackerId = req.query.trackerId ? Number(req.query.trackerId) : undefined
    const from = typeof req.query.from === 'string' ? req.query.from : undefined
    const to   = typeof req.query.to   === 'string' ? req.query.to   : undefined
    if (!trackerId) return res.status(400).json({ error: 'trackerId requis' })
    const trips = await listTrips(new GeorideProvider(), { trackerId, from, to })
    res.json(trips)
  } catch (e:any) {
    res.status(400).json({ error: e.message })
  }
})

// GET /georide/trips/:tripId/geojson?trackerId=...&from=...&to=...

app.get('/georide/trips/:id/geojson', async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const trackerId = Number(req.query.trackerId)
  const from = req.query.from as string | undefined
  const to = req.query.to as string | undefined

  if (!Number.isFinite(id) || !Number.isFinite(trackerId)) {
    //add id and trackerId in the error message
    return res.status(400).json({ error: `id (${id}) and trackerId (${trackerId}) are required numbers` })
  }
  if (!from || !to) {
    return res.status(400).json({ error: 'from and to (ISO) are required' })
  }
  const fromDate = new Date(from)
  const toDate = new Date(to)
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime()) || fromDate >= toDate) {
    return res.status(400).json({ error: 'invalid from/to' })
  }

  try {
    const feature = await getTripGeoJSON(new GeorideProvider(),{
      trackerId,
      id: id,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
    })
    return res.json(feature)
  } catch (e: any) {
    console.error('GET /georide/trips/:id/geojson failed', {
      id, trackerId, from, to, message: e?.message,
    })
    return res.status(502).json({ error: 'georide upstream error' })
  }
})

// POST /trips/import
app.post('/trips/import', async (req: Request, res: Response) => {
  const { trackerId, from, to } = req.body;
  if (!trackerId || !from || !to) {
    return res.status(400).json({ error: 'trackerId, from, to requis' });
  }

  try {
    console.log(`🔄 Import de trajet demandé: trackerId=${trackerId}, from=${from}, to=${to}`);
    await importTrips(trackerId, from, to);
    res.status(200).json({ success: true, message: 'Trajet importé avec succès' });
  } catch (err) {
    console.error('❌ Erreur import trajet:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' });
  }
});


app.get('/trips', async (req: Request, res: Response) => {
  try {
    const from = typeof req.query.from === 'string' ? req.query.from : undefined
    const to = typeof req.query.to === 'string' ? req.query.to : undefined
    const trips = await listTrips(new LocalProvider(), { from, to })
    res.json(trips)
  } catch (e:any) {
    res.status(500).json({ error: e.message })
  }
})

// GET /trips/:id
app.get('/trips/:id', async (req: Request, res: Response) => {
  const tripId = parseInt(req.params.id);
  if (isNaN(tripId)) return res.status(400).json({ error: 'ID invalide' });

  const trip = await getTripById(tripId);
  if (!trip) return res.status(404).json({ error: 'Trip introuvable' });

  res.json(trip);
});

app.get('/trips/:id/geojson', async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
  try {
    const feature = await getTripGeoJSON(new LocalProvider(), { id })
    if (!feature.geometry.coordinates.length) {
      return res.status(404).json({ error: 'Aucune position trouvée pour ce trajet' })
    }
    res.json(feature)
  } catch (e:any) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/trips/:id/positions', async (req: Request, res: Response) => {
  const tripId = parseInt(req.params.id);
  if (isNaN(tripId)) {
    return res.status(400).json({ error: 'ID invalide' });
  }

  try {
    const positions = await getPositionsByTripId(tripId);
    if (!positions.length) {
      return res.status(404).json({ error: 'Aucune position pour ce trajet' });
    }

    res.json(positions);
  } catch (err) {
    console.error('Erreur /trips/:id/positions :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/trips/:id', async (req: Request, res: Response) => {
  const tripId = parseInt(req.params.id);
  if (isNaN(tripId)) {
    return res.status(400).json({ error: 'ID invalide' });
  }

  try {
    await deleteTripById(tripId);
    res.status(204).send(); // No Content
  } catch (err) {
    console.error('Erreur DELETE /trips/:id :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========== ENDPOINTS CACHE GEORIDE ==========

// GET /cache/stats - Statistiques du cache GeoRide
app.get('/cache/stats', async (req: Request, res: Response) => {
  try {
    const stats = getCacheStats();
    res.json(stats);
  } catch (err) {
    console.error('Erreur /cache/stats :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /cache - Vider le cache GeoRide
app.delete('/cache', async (req: Request, res: Response) => {
  try {
    clearGeoRideCache();
    res.json({ message: 'Cache GeoRide vidé avec succès' });
  } catch (err) {
    console.error('Erreur DELETE /cache :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========== ENDPOINTS SPATIAUX POSTGIS ==========

// GET /trips/near?lon=2.3522&lat=48.8566&radius=1000
app.get('/trips/near', async (req: Request, res: Response) => {
  const lon = parseFloat(req.query.lon as string);
  const lat = parseFloat(req.query.lat as string);
  const radius = parseInt(req.query.radius as string) || 1000; // 1km par défaut

  if (isNaN(lon) || isNaN(lat)) {
    return res.status(400).json({ error: 'lon et lat requis (nombres)' });
  }

  try {
    const trips = await SpatialQueries.findTripsNearPoint(lon, lat, radius);
    res.json(trips);
  } catch (err) {
    console.error('Erreur /trips/near :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /trips/distance/:id1/:id2 - Distance entre deux trajets
app.get('/trips/distance/:id1/:id2', async (req: Request, res: Response) => {
  const id1 = parseInt(req.params.id1);
  const id2 = parseInt(req.params.id2);

  if (isNaN(id1) || isNaN(id2)) {
    return res.status(400).json({ error: 'IDs invalides' });
  }

  try {
    const distance = await SpatialQueries.distanceBetweenTrips(id1, id2);
    res.json({ 
      trip1: id1, 
      trip2: id2, 
      distanceMeters: distance,
      distanceKm: Math.round(distance / 1000 * 100) / 100
    });
  } catch (err) {
    console.error('Erreur /trips/distance :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


(async () => {
  await initDb();

  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log(`🚀 API REST disponible sur http://localhost:${port}`);
  });
})();