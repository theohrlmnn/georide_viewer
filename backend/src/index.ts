import { createServer } from 'http';
import { importTrips } from './services/tripImporter';
import dotenv from 'dotenv';
import logger from './utils/logger';

import {Trip} from './types';

dotenv.config();


const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'POST' && req.url === '/import-trips') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      const { trackerId, from, to } = JSON.parse(body);
      try {
        await importTrips(trackerId, from, to);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        if (err instanceof Error) {
          logger.error({ err }, 'Erreur lors de l’import de trajets');
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        } else {
          logger.error({ err }, 'Erreur inconnue');
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Erreur inconnue' }));
        }
      }
    });
  } else if (req.method === 'GET' && req.url?.startsWith('/geojson/')) {
    const parts = req.url.split('/');
    if (parts.length !== 4) {
      res.writeHead(400);
      res.end('URL invalide');
      return;
    }

    const trackerId = parseInt(parts[2]);
    const tripId = parseInt(parts[3]);

    if (isNaN(trackerId) || isNaN(tripId)) {
      res.writeHead(400);
      res.end('trackerId ou tripId invalide');
      return;
    }

    try {
      const from = '2025-07-01T00:00:00Z'; // à adapter dynamiquement plus tard
      const to = '2025-07-31T23:59:59Z';
      const { getTrips } = await import('./services/georideClient');
      const { getTripGeoJSON } = await import('./services/georideFormatter');

      const trips = await getTrips(trackerId, from, to);
      const trip = trips.find((t: Trip) => t.id === tripId);

      if (!trip) {
        res.writeHead(404);
        res.end('Trajet non trouvé');
        return;
      }

      const geojson = await getTripGeoJSON(trip);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(geojson));
    } catch (err) {
      logger.error({ err }, 'Erreur lors de la récupération GeoJSON');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: (err instanceof Error) ? err.message : 'Erreur inconnue' }));
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});



server.listen(4000, () => {
  console.log("Server is running at http://localhost:4000");
});

