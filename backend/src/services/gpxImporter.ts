// services/gpxImporter.ts
import pool from '../db'
import { insertTripPositions } from '../repositories/tripPositionsRepository'
import { buildRouteGeometrySimple } from '../utils/geometryUtils'

export interface GpxInputPoint {
  lat: number
  lon: number
  time: string  // ISO string
}

export interface GpxImportArgs {
  name: string
  points: GpxInputPoint[]
}

export interface GpxImportResult {
  tripId: number
  points: number
  distanceMeters: number
}

// ── Géographie ──────────────────────────────────────────────────────────────

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

// ── Import principal ─────────────────────────────────────────────────────────

export async function importGpxData(args: GpxImportArgs): Promise<GpxImportResult> {
  const { name, points } = args

  if (!Array.isArray(points) || points.length < 2) {
    throw new Error('Pas assez de points GPS (minimum 2)')
  }

  // Valider et trier par timestamp croissant
  const sorted = points
    .filter(p =>
      typeof p.lat === 'number' && isFinite(p.lat) &&
      typeof p.lon === 'number' && isFinite(p.lon) &&
      typeof p.time === 'string' && !isNaN(new Date(p.time).getTime())
    )
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

  if (sorted.length < 2) throw new Error('Pas assez de points GPS valides après filtrage')

  const startPt = sorted[0]
  const endPt   = sorted[sorted.length - 1]
  const startMs = new Date(startPt.time).getTime()
  const endMs   = new Date(endPt.time).getTime()
  const durationMs = endMs - startMs

  // Calcul des positions enrichies (distance cumulée, vitesse, cap)
  let totalDistM = 0
  let maxSpeedMs = 0

  const positions = sorted.map((p, i) => {
    let speedMs = 0
    let angle   = 0

    if (i > 0) {
      const prev = sorted[i - 1]
      const dist = haversineMeters(prev.lat, prev.lon, p.lat, p.lon)
      totalDistM += dist

      const dtSec = (new Date(p.time).getTime() - new Date(prev.time).getTime()) / 1000
      speedMs = dtSec > 0 ? dist / dtSec : 0
      angle   = bearingDeg(prev.lat, prev.lon, p.lat, p.lon)
      if (speedMs > maxSpeedMs) maxSpeedMs = speedMs
    }

    return {
      fixtime:   p.time,
      latitude:  p.lat,
      longitude: p.lon,
      // Converti en nœuds pour cohérence avec les données GeoRide
      speed:     speedMs * 1.94384,
      angle:     Math.round(angle),
      address:   '',
    }
  })

  const avgSpeedMs = durationMs > 0 ? totalDistM / (durationMs / 1000) : 0

  // ID unique via séquence (valeurs négatives → jamais de collision avec GeoRide)
  const idRes = await pool.query(`SELECT NEXTVAL('gpx_trip_id_seq') AS id`)
  const tripId = parseInt(idRes.rows[0].id)

  // Insertion du trajet (noms de colonnes sans guillemets → insensible à la casse, cohérent avec tripRepository)
  await pool.query(
    `INSERT INTO trips (
        id, trackerid, starttime, endtime,
        startlat, startlon, endlat, endlon,
        distance, averagespeed, maxspeed, duration,
        startaddress, endaddress,
        startgeom, endgeom
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11, $12,
        $13, $14,
        ST_SetSRID(ST_MakePoint($15, $16), 4326),
        ST_SetSRID(ST_MakePoint($17, $18), 4326)
      )`,
    [
      tripId, 0,
      new Date(startPt.time).toISOString(),
      new Date(endPt.time).toISOString(),
      startPt.lat, startPt.lon,
      endPt.lat,   endPt.lon,
      Math.round(totalDistM),
      avgSpeedMs * 1.94384,
      maxSpeedMs * 1.94384,
      durationMs,
      name || 'Import GPX', '',
      startPt.lon, startPt.lat,
      endPt.lon,   endPt.lat,
    ]
  )

  // Positions + géométrie de route
  await insertTripPositions(tripId, positions)
  await buildRouteGeometrySimple(tripId)

  console.log(`✅ GPX importé: tripId=${tripId}, ${sorted.length} pts, ${(totalDistM / 1000).toFixed(1)} km`)

  return { tripId, points: sorted.length, distanceMeters: Math.round(totalDistM) }
}
