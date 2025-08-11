import type { Trip, Position } from '../types'

export interface ListArgs {
  trackerId?: number
  from?: string
  to?: string
}

export interface GeojsonArgs {
  id: number
  trackerId?: number
  from?: string
  to?: string
}

export interface TripProvider {
  listTrips(args: ListArgs): Promise<Trip[]>
  getPositions(args: GeojsonArgs): Promise<Position[]>
}
