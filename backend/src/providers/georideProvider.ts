import fetch from 'node-fetch'
import type { TripProvider, ListArgs, GeojsonArgs } from './tripProvider'
import type { Trip, Position } from '../types'
//import { getGeoRideToken } from '../services/tokenService' // <-- ton service token existant

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
    const token = process.env.GEORIDE_API_TOKEN 
    const qs = new URLSearchParams({ from, to })
    const url = `${BASE}/tracker/${trackerId}/trips/positions?${qs}`

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(`GeoRide error: ${res.status}`)
    const raw = await res.json()

    return raw.map((p: any): Position => ({
        fix_time: p.fix_time,
        latitude: p.latitude,
        longitude: p.longitude,
        speed: p.speed,
        address: p.address,
        angle: p.angle,
    }))
  }
}
