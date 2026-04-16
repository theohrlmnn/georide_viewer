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
  /**
   * Tolerance Douglas-Peucker en degres appliquee cote service.
   * - undefined  -> valeur par defaut (DEFAULT_SIMPLIFY_TOLERANCE)
   * - 0 ou <= 0  -> pas de simplification (polyligne brute)
   */
  tolerance?: number
}

export interface TripProvider {
  listTrips(args: ListArgs): Promise<Trip[]>
  getPositions(args: GeojsonArgs): Promise<Position[]>
}
