import type { TripProvider, ListArgs, GeojsonArgs } from '../providers/tripProvider'
import type { Trip, GeoJSONFeature } from '../types'
import { simplifyDouglasPeucker, type LngLat } from '../utils/simplifyPolyline'

/**
 * Tolerance Douglas-Peucker par defaut, en degres.
 * ~5 m a nos latitudes : invisible a l'echelle d'une carte de trajet,
 * reduit tres fortement le nombre de points pour les trackers a haute frequence.
 */
export const DEFAULT_SIMPLIFY_TOLERANCE = 0.00005

export async function listTrips(provider: TripProvider, args: ListArgs): Promise<Trip[]> {
  return provider.listTrips(args)
}

export async function getTripGeoJSON(provider: TripProvider, args: GeojsonArgs): Promise<GeoJSONFeature> {
  const positions = await provider.getPositions(args)
  const rawCoordinates: LngLat[] = positions.map(p => [p.longitude, p.latitude] as LngLat)
  const originalPoints = rawCoordinates.length

  const tolerance = args.tolerance ?? DEFAULT_SIMPLIFY_TOLERANCE
  const coordinates = tolerance > 0
    ? simplifyDouglasPeucker(rawCoordinates, tolerance)
    : rawCoordinates

  return {
    type: 'Feature',
    properties: {
      id: args.id,
      source: provider.constructor.name.replace('Provider', '').toLowerCase(), // "georide" | "local"
      trackerId: args.trackerId ?? null,
      from: args.from ?? null,
      to: args.to ?? null,
      points: coordinates.length,
      originalPoints,
      simplified: coordinates.length !== originalPoints,
      tolerance,
    },
    geometry: { type: 'LineString', coordinates }
  }
}
