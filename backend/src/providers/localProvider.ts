// src/providers/localProvider.ts
import type { TripProvider, ListArgs, GeojsonArgs } from './tripProvider'
import type { Trip, Position } from '../types'
import { getAllTrips, getTripById } from '../repositories/tripRepository'
import { getPositionsByTripId } from '../repositories/tripPositionsRepository'

export class LocalProvider implements TripProvider {
  async listTrips(_: ListArgs): Promise<Trip[]> {
    // On garde la normalisation côté repo: tripRepository renvoie déjà les bons alias
    return getAllTrips()
  }

  async getPositions({ id }: GeojsonArgs): Promise<Position[]> {
    if (!id) throw new Error('id requis')
    // Optionnel: s’assurer que le trip existe (sinon 404 logique)
    const trip = await getTripById(id)
    if (!trip) throw new Error('Trip introuvable')
    return getPositionsByTripId(id)
  }
}
