import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { initDb } from './db/initDb';
import pool from './db/index';
import { importTrips } from './services/tripImporter';
import { getAllTrips, getTripById, deleteTripById, findExistingTripIds } from './repositories/tripRepository';
import { getPositionsByTripId } from './repositories/tripPositionsRepository';

import { GeorideProvider } from './providers/georideProvider'
import { LocalProvider } from './providers/localProvider'
import { listTrips, getTripGeoJSON } from './services/tripService'
import { SpatialQueries } from './utils/geometryUtils'
import { getCacheStats, clearGeoRideCache } from './services/georideCache'
import { startTokenCron, getToken, login, logout, getAuthStatus } from './services/tokenService'
import {
  getAllGroups,
  createGroup,
  renameGroup,
  deleteGroup,
  addTripToGroup,
  removeTripFromGroup,
} from './repositories/groupRepository'
import { importGpxData } from './services/gpxImporter'
import helmet from 'helmet'
dotenv.config();



const app = express();
const port = process.env.PORT || 4000;

app.use(helmet())
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json({ limit: '10mb' }))

/**
 * Parse la query ?tolerance= d'une route GeoJSON.
 * - absente / invalide -> undefined (valeur par defaut du service)
 * - 0 ou <= 0          -> 0 (pas de simplification, polyligne brute)
 * - nombre valide      -> valeur clampee a [0, 0.01] (0.01 deg ~ 1.1 km, garde-fou)
 */
function parseTolerance(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined
  const n = Number(raw)
  if (!Number.isFinite(n)) return undefined
  if (n <= 0) return 0
  return Math.min(n, 0.01)
}

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
    const ids = trips.map((t: any) => t.id).filter((id: any) => id != null)
    const existingIds = await findExistingTripIds(ids)
    const enriched = trips.map((t: any) => ({ ...t, imported: existingIds.has(t.id) }))
    res.json(enriched)
  } catch (e:any) {
    const msg = e.message || ''
    if (msg.includes('Non authentifie') || msg.includes('Token expire') || msg.includes('401')) {
      return res.status(401).json({ error: msg })
    }
    res.status(400).json({ error: msg })
  }
})

// GET /georide/trips/:tripId/geojson?trackerId=...&from=...&to=...

app.get('/georide/trips/:id/geojson', async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const trackerId = Number(req.query.trackerId)
  const from = req.query.from as string | undefined
  const to = req.query.to as string | undefined
  const tolerance = parseTolerance(req.query.tolerance)

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
      tolerance,
    })
    return res.json(feature)
  } catch (e: any) {
    const msg = e?.message || ''
    console.error('GET /georide/trips/:id/geojson failed', {
      id, trackerId, from, to, message: msg,
    })
    if (msg.includes('Non authentifie') || msg.includes('Token expire') || msg.includes('401')) {
      return res.status(401).json({ error: msg })
    }
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
  const tolerance = parseTolerance(req.query.tolerance)
  try {
    const feature = await getTripGeoJSON(new LocalProvider(), { id, tolerance })
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

// ========== IMPORT GPX ==========

// POST /trips/import/gpx-data
// Body : { name: string, points: Array<{ lat, lon, time }> }
// Le parsing XML est fait côté client (DOMParser) ; le backend ne reçoit que du JSON.
app.post('/trips/import/gpx-data', async (req: Request, res: Response) => {
  const { name, points } = req.body
  if (!Array.isArray(points) || points.length < 2) {
    return res.status(400).json({ error: 'points requis (tableau ≥ 2 éléments)' })
  }
  try {
    const result = await importGpxData({ name: String(name || 'Import GPX'), points })
    res.status(201).json(result)
  } catch (err: any) {
    console.error('❌ Erreur import GPX:', err)
    res.status(400).json({ error: err.message })
  }
})

// ========== GROUPES DE TRAJETS ==========

// GET /groups — liste tous les groupes avec stats
app.get('/groups', async (_req, res) => {
  try {
    const groups = await getAllGroups()
    res.json(groups)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /groups — créer un groupe { name, tripIds? }
app.post('/groups', async (req: Request, res: Response) => {
  const { name, tripIds = [] } = req.body
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name requis' })
  }
  if (!Array.isArray(tripIds) || tripIds.some(id => !Number.isInteger(id))) {
    return res.status(400).json({ error: 'tripIds doit être un tableau d\'entiers' })
  }
  try {
    const group = await createGroup(name, tripIds)
    res.status(201).json(group)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /groups/:id — renommer un groupe { name }
app.patch('/groups/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
  const { name } = req.body
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name requis' })
  }
  try {
    await renameGroup(id, name)
    res.json({ success: true })
  } catch (err: any) {
    res.status(404).json({ error: err.message })
  }
})

// DELETE /groups/:id — supprimer un groupe
app.delete('/groups/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id)
  if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' })
  try {
    await deleteGroup(id)
    res.status(204).send()
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /groups/:id/trips — ajouter un trajet au groupe { tripId }
app.post('/groups/:id/trips', async (req: Request, res: Response) => {
  const groupId = parseInt(req.params.id)
  const tripId  = parseInt(req.body.tripId)
  if (isNaN(groupId) || isNaN(tripId)) {
    return res.status(400).json({ error: 'groupId et tripId requis (entiers)' })
  }
  try {
    await addTripToGroup(groupId, tripId)
    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /groups/:id/trips/:tripId — retirer un trajet du groupe
app.delete('/groups/:id/trips/:tripId', async (req: Request, res: Response) => {
  const groupId = parseInt(req.params.id)
  const tripId  = parseInt(req.params.tripId)
  if (isNaN(groupId) || isNaN(tripId)) {
    return res.status(400).json({ error: 'IDs invalides' })
  }
  try {
    await removeTripFromGroup(groupId, tripId)
    res.status(204).send()
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

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


// ========== AUTHENTIFICATION GEORIDE ==========

// POST /auth/login - Connexion GeoRide depuis l'UI
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    res.status(400).json({ error: 'Email et mot de passe requis' })
    return
  }

  try {
    await login(email, password)
    res.json({ success: true, message: 'Connexion reussie' })
  } catch (err: any) {
    res.status(401).json({ error: err.message })
  }
})

// GET /auth/status - Statut de l'authentification
app.get('/auth/status', async (req, res) => {
  try {
    const status = await getAuthStatus()
    res.json(status)
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /auth/logout - Deconnexion
app.post('/auth/logout', async (req, res) => {
  try {
    await logout()
    res.json({ success: true, message: 'Deconnexion reussie' })
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' })
  }
});

(async () => {
  await initDb();
  startTokenCron();

  app.listen(port, () => {
    console.log(`🚀 API REST disponible sur http://localhost:${port}`);
  });
})();