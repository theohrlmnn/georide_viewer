import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { initDb } from './db/initDb';
import { importTrips } from './services/tripImporter';
import { getAllTrips, getTripById, deleteTripById } from './repositories/tripRepository';
import { getPositionsByTripId } from './repositories/tripPositionsRepository';
import { getTrips } from './services/georideClient';

import { GeorideProvider } from './providers/georideProvider'
import { LocalProvider } from './providers/localProvider'
import { listTrips, getTripGeoJSON } from './services/tripService'
import helmet from 'helmet'
dotenv.config();



const app = express();
const port = process.env.PORT || 4000;

app.use(helmet())
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

// GET /trips/georide?trackerId=2055973&from=ISO&to=ISO
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

// GET /trips/georide/:tripId/geojson?trackerId=...&from=...&to=...
app.get('/georide/trips/:id/geojson', async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const trackerId = Number(req.query.trackerId)
  const from = req.query.from as string | undefined
  const to   = req.query.to as string | undefined
  if (!id || !trackerId || !from || !to) {
    return res.status(400).json({ error: 'id, trackerId, from, to requis' })
  }
  try {
    const feature = await getTripGeoJSON(new GeorideProvider(), { id, trackerId, from, to })
    res.json(feature)
  } catch (e:any) {
    res.status(500).json({ error: e.message })
  }
})

// POST /trips/import
app.post('/trips/import', async (req: Request, res: Response) => {
  const { trackerId, from, to } = req.body;
  if (!trackerId || !from || !to) {
    return res.status(400).json({ error: 'trackerId, from, to requis' });
  }

  try {
    await importTrips(trackerId, from, to);
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erreur inconnue' });
  }
});

app.get('/trips', async (req: Request, res: Response) => {
  try {
    const trips = await listTrips(new LocalProvider(), {})
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


(async () => {
  await initDb();

  const port = process.env.PORT || 4000;
  app.listen(port, () => {
    console.log(`🚀 API REST disponible sur http://localhost:${port}`);
  });
})();