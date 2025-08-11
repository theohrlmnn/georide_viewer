import type { TripProvider, ListArgs, GeojsonArgs } from '../providers/tripProvider'
import type { Trip, GeoJSONFeature } from '../types'

export async function listTrips(provider: TripProvider, args: ListArgs): Promise<Trip[]> {
  return provider.listTrips(args)
}

export async function getTripGeoJSON(provider: TripProvider, args: GeojsonArgs): Promise<GeoJSONFeature> {
  const positions = await provider.getPositions(args)
  const coordinates = positions.map(p => [p.longitude, p.latitude] as [number, number])

  return {
    type: 'Feature',
    properties: {
      trip_id: args.id,
      source: provider.constructor.name.replace('Provider', '').toLowerCase(), // "georide" | "local"
      tracker_id: args.trackerId ?? null,
      from: args.from ?? null,
      to: args.to ?? null,
      points: coordinates.length,
    },
    geometry: { type: 'LineString', coordinates }
  }
}
