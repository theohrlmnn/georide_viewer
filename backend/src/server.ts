import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { initDb } from './db/initDb';
import { importTrips } from './services/tripImporter';
import { getAllTrips, getTripById, deleteTripById } from './repositories/tripRepository';
import { getTripGeoJSON, getPositionsByTripId } from './repositories/tripPositionsRepository';

dotenv.config();



const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json()); // parse JSON body

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

// GET /trips
app.get('/trips', async (req: Request, res: Response) => {
  const trips = await getAllTrips();
  res.json(trips);
});

// GET /trips/:id
app.get('/trips/:id', async (req: Request, res: Response) => {
  const tripId = parseInt(req.params.id);
  if (isNaN(tripId)) return res.status(400).json({ error: 'ID invalide' });

  const trip = await getTripById(tripId);
  if (!trip) return res.status(404).json({ error: 'Trip introuvable' });

  res.json(trip);
});

app.get('/trips/:id/geojson', async (req, res) => {
  const tripId = parseInt(req.params.id);
  if (isNaN(tripId)) {
    return res.status(400).json({ error: 'ID invalide' });
  }

  try {
    const geojson = await getTripGeoJSON(tripId);
    if (!geojson.geometry.coordinates.length) {
      return res.status(404).json({ error: 'Aucune position trouvée pour ce trajet' });
    }

    res.json(geojson);
  } catch (err) {
    console.error('Erreur /trips/:id/geojson :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/trips/:id/positions', async (req, res) => {
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

app.delete('/trips/:id', async (req, res) => {
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