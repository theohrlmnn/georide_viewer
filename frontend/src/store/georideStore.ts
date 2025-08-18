// src/store/georideStore.ts
import { create } from 'zustand'
import { apiClient } from '../utils/apiClient'
import { API_BASE_URL } from '../config'

export type ViewMode = 'georide' | 'local'

export type Trip = {
  id?: number | null
  trackerId?: number | null
  startTime?: string | null
  endTime?: string | null
  distance?: number | null
  duration?: number | null
  averageSpeed?: number | null
  selected?: boolean
}

type GeojsonCache = Record<string, any>

type State = {
  viewMode: ViewMode
  dateFrom?: string
  dateTo?: string
  trackerId?: number
  showAllTrips: boolean
  trips: Trip[]
  geojsonCache: GeojsonCache
  loading: boolean
  error?: string
}

type Actions = {
  setViewMode: (m: ViewMode) => void
  setDateRange: (from?: string, to?: string) => void
  resetDateRange: () => void
  setTrackerId: (id?: number) => void
  setShowAllTrips: (show: boolean) => void

  resetGeojson: () => void
  clearTrips: () => void
  setGeojsonFor: (key: string, data: any) => void

  toggleTrip: (trip: Trip) => void
  fetchTrips: (baseUrl: string, trackerId?: number) => Promise<void>
  refreshTrips: () => void
}

// ---------- helpers partagés ----------

// Fonction pour calculer les dates par défaut (dernières 24 heures)
const getDefaultDateRange = () => {
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  
  // Utiliser le format YYYY-MM-DD à midi UTC pour éviter les problèmes de fuseau horaire
  const formatDateSafe = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}T12:00:00.000Z`
  }
  
  return {
    from: formatDateSafe(yesterday),
    to: formatDateSafe(now)
  }
}

export const normalizeKey = (t: Trip) =>
  t.id != null ? `id:${t.id}` : `trk:${t.trackerId}|${t.startTime}|${t.endTime}`

export const cacheKey = (mode: ViewMode, t: Trip) => `${mode}:${normalizeKey(t)}`

// (même algo des deux côtés pour garantir une couleur stable coordonnée avec la légende)
export const colorOf = (t: Trip) => {
  const k = normalizeKey(t)
  let h = 0
  for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) | 0
  const palette = [
    '#e6194b', '#3cb44b', '#ffe119', '#0082c8', '#f58231',
    '#911eb4', '#46f0f0', '#f032e6', '#d2f53c', '#fabebe',
    '#008080', '#e6beff', '#aa6e28', '#800000', '#808000'
  ]
  return palette[Math.abs(h) % palette.length]
}
export const hasBounds = (t: Trip) => !!(t.startTime && t.endTime)

const strip = (u: string) => u.replace(/\/+$/, '')

const buildTripsUrl = (
  baseUrl: string,
  mode: ViewMode,
  from?: string,
  to?: string,
  trackerId?: number,
  showAllTrips?: boolean
) => {
  const base = strip(baseUrl)
  if (mode === 'georide') {
    const p = new URLSearchParams()
    if (trackerId != null) p.set('trackerId', String(trackerId))
    if (from && !showAllTrips) p.set('from', from)
    if (to && !showAllTrips) p.set('to', to)
    return `${base}/georide/trips?${p.toString()}`
  }
  const p = new URLSearchParams()
  if (from && !showAllTrips) p.set('from', from)
  if (to && !showAllTrips) p.set('to', to)
  const qs = p.toString()
  return qs ? `${base}/trips?${qs}` : `${base}/trips`
}

// ---------- store ----------
export const useGeoRideStore = create<State & Actions>((set, get) => {
  const defaultDates = getDefaultDateRange()
  
  return {
    viewMode: 'georide',
    dateFrom: defaultDates.from,
    dateTo: defaultDates.to,
    showAllTrips: false,
    trips: [],
    geojsonCache: {},
    loading: false,

    setViewMode: (m) => set({ viewMode: m }),
    setDateRange: (from, to) => set({ dateFrom: from, dateTo: to }),
    resetDateRange: () => {
      const newDefaults = getDefaultDateRange()
      set({ dateFrom: newDefaults.from, dateTo: newDefaults.to })
    },
    setTrackerId: (id) => set({ trackerId: id }),
    setShowAllTrips: (show) => set({ showAllTrips: show }),

    resetGeojson: () => set({ geojsonCache: {} }),
    clearTrips: () => set({ trips: [] }),

    setGeojsonFor: (key, data) => set(s => ({
      geojsonCache: { ...s.geojsonCache, [key]: data }
    })),

    toggleTrip: (trip) => set(s => ({
      trips: s.trips.map(t =>
        normalizeKey(t) === normalizeKey(trip) ? { ...t, selected: !t.selected } : t
      )
    })),

    fetchTrips: async (baseUrl: string, trackerId?: number) => {
      const { viewMode, dateFrom, dateTo, showAllTrips, trips } = get()
      set({ loading: true, error: undefined })
      try {
        const prevMap = new Map(trips.map(t => [normalizeKey(t), !!t.selected]))
        const url = buildTripsUrl(baseUrl, viewMode, dateFrom, dateTo, trackerId ?? get().trackerId, showAllTrips)
        
        // Utiliser le client API avec retry
        const endpoint = url.replace(baseUrl, '')
        const res = await apiClient.get(endpoint)
        
        if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`)
        const incoming: Trip[] = await res.json()

        // Préserver selected au refresh
        const merged = incoming.map(t => ({
          ...t,
          selected: prevMap.get(normalizeKey(t)) ?? false
        }))

        set({ trips: merged })
      } catch (e: any) {
        set({ error: String(e?.message ?? e) })
      } finally {
        set({ loading: false })
      }
    },

    refreshTrips: () => {
      const { viewMode, trackerId } = get()
      // En mode georide, on a besoin d'un trackerId
      if (viewMode === 'georide' && !trackerId) return
      // En mode local, on rafraîchit sans trackerId
      get().fetchTrips(API_BASE_URL, viewMode === 'georide' ? trackerId : undefined)
    },
  }
})
