// src/store/georideStore.ts
import { create } from 'zustand'

type ViewMode = 'georide' | 'local'
const isoNow = () => new Date().toISOString()
const isoMinus = (h: number) => new Date(Date.now() - h * 3600_000).toISOString()

interface GeoRideStore {
  viewMode: ViewMode
  dateFrom?: string
  dateTo?: string

  setViewMode: (m: ViewMode) => void
  setDateRange: (from?: string, to?: string) => void

  trips: any[]
  setTrips: (t: any[]) => void
  toggleTrip: (id: number) => void

  geojsonCache: Record<number, any>
  setGeojsonFor: (id: number, data: any) => void

  loading: boolean
  error?: string

  fetchTrips: (baseUrl: string) => Promise<void>
}

export const useGeoRideStore = create<GeoRideStore>((set, get) => ({
  viewMode: 'georide',
  dateFrom: isoMinus(24),
  dateTo: isoNow(),

  setViewMode: (m) => set({ viewMode: m }),
  setDateRange: (from, to) => set({ dateFrom: from, dateTo: to }),

  trips: [],
  setTrips: (t) => set({ trips: t }),
  toggleTrip: (id) =>
    set((s) => ({ trips: s.trips.map(x => x.id === id ? { ...x, selected: !x.selected } : x) })),

  geojsonCache: {},
  setGeojsonFor: (id, data) => set((s) => ({ geojsonCache: { ...s.geojsonCache, [id]: data } })),

  loading: false,
  error: undefined,

  fetchTrips: async (baseUrl: string) => {
    const { viewMode, dateFrom, dateTo, setTrips } = get()
    const url = new URL(
      viewMode === 'georide' ? `${baseUrl}/georide/trips` : `${baseUrl}/trips`
    )
    
    if (viewMode === 'georide') {
      const trackerId = 2055973 // TODO: rendre dynamique
      if (!trackerId) throw new Error('trackerId requis')
      if (!dateFrom || !dateTo) throw new Error('from/to requis en mode georide')
      url.searchParams.set('trackerId', String(trackerId))
      url.searchParams.set('from', dateFrom)
      url.searchParams.set('to', dateTo)
    }

    set({ loading: true, error: undefined })
    try {
      const res = await fetch(url.toString())
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (!Array.isArray(data)) throw new Error('Réponse inattendue')
      const norm = data.map((t: any) => ({
        id: t.id,
        tracker_id: t.tracker_id ?? t.trackerId ?? null,
        start_time: t.start_time ?? t.startTime,
        end_time: t.end_time ?? t.endTime,
        distance: t.distance ?? 0,
        average_speed: t.average_speed ?? t.averageSpeed ?? 0,
        duration: t.duration ?? 0,
        start_address: t.start_address ?? t.startAddress ?? null,
        end_address: t.end_address ?? t.endAddress ?? null,
        selected: false,
      }))
      setTrips(norm)
    } catch (e: any) {
      set({ error: e?.message ?? 'Erreur de chargement' })
    } finally {
      set({ loading: false })
    }
  },
}))
