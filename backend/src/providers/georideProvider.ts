import fetch from 'node-fetch'
import type { TripProvider, ListArgs, GeojsonArgs } from './tripProvider'
import type { Trip, Position } from '../types'
import { getCachedPositions } from '../services/georideCache'

const BASE = 'https://api.georide.com'

export class GeorideProvider implements TripProvider {
  async listTrips({ trackerId, from, to }: ListArgs): Promise<Trip[]> {
    if (!trackerId) throw new Error('trackerId requis')
    const token = process.env.GEORIDE_API_TOKEN
    const qs = new URLSearchParams()
    if (from) qs.set('from', from)
    if (to)   qs.set('to', to)
    const url = `${BASE}/tracker/${trackerId}/trips${qs.toString() ? `?${qs}` : ''}`

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(`GeoRide error: ${res.status}`)
    const raw = await res.json()


    return raw
  }

  async getPositions({ trackerId, from, to }: GeojsonArgs): Promise<Position[]> {
    if (!trackerId || !from || !to) throw new Error('trackerId, from, to requis')
    
    // Utiliser le cache pour éviter les requêtes multiples vers GeoRide
    return getCachedPositions(trackerId, from, to)
  }
}
