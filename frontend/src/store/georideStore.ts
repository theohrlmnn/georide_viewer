// src/store/georideStore.ts
import { create } from 'zustand'
import { apiClient } from '../utils/apiClient'
import { API_BASE_URL } from '../config'

export type ViewMode = 'georide' | 'local'
export type SortBy = 'date' | 'distance' | 'duration'
export type SortDir = 'asc' | 'desc'

export type Trip = {
  id?: number | null
  trackerId?: number | null
  startTime?: string | null
  endTime?: string | null
  distance?: number | null
  duration?: number | null
  averageSpeed?: number | null
  maxSpeed?: number | null
  maxAngle?: number | null
  maxLeftAngle?: number | null
  maxRightAngle?: number | null
  averageAngle?: number | null
  startAddress?: string | null
  endAddress?: string | null
  selected?: boolean
  imported?: boolean
}

export type TripGroup = {
  id: number
  name: string
  tripIds: number[]
  totalDistance: number
  totalDuration: number
  tripCount: number
  createdAt?: string
}

type GeojsonCache = Record<string, any>

type State = {
  viewMode: ViewMode
  dateFrom?: string
  dateTo?: string
  trackerId?: number
  showAllTrips: boolean
  sortBy: SortBy
  sortDir: SortDir
  trips: Trip[]
  geojsonCache: GeojsonCache
  loading: boolean
  error?: string
  // Groupes
  groups: TripGroup[]
  groupsExpanded: Record<number, boolean>
  groupsLoading: boolean
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

  setSortBy: (sort: SortBy) => void
  toggleTrip: (trip: Trip) => void
  fetchTrips: (baseUrl: string, trackerId?: number) => Promise<void>
  refreshTrips: () => void

  // Groupes
  fetchGroups: () => Promise<void>
  createGroup: (name: string, tripIds: number[]) => Promise<void>
  renameGroup: (id: number, name: string) => Promise<void>
  deleteGroup: (id: number) => Promise<void>
  addTripToGroup: (groupId: number, tripId: number) => Promise<void>
  removeTripFromGroup: (groupId: number, tripId: number) => Promise<void>
  toggleGroupExpanded: (groupId: number) => void
  toggleGroupAllSelected: (groupId: number) => void
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

// Palette partagée par colorOf et groupColorOf — même algo, clé différente
const COLOR_PALETTE = [
  '#e6194b', '#3cb44b', '#ffe119', '#0082c8', '#f58231',
  '#911eb4', '#46f0f0', '#f032e6', '#d2f53c', '#fabebe',
  '#008080', '#e6beff', '#aa6e28', '#800000', '#808000',
]
const hashStr = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return COLOR_PALETTE[Math.abs(h) % COLOR_PALETTE.length]
}

/** Couleur stable d'un trajet individuel */
export const colorOf = (t: Trip) => hashStr(normalizeKey(t))

/** Couleur stable d'un groupe (hashée sur son ID) */
export const groupColorOf = (g: TripGroup) => hashStr(`group:${g.id}`)

/**
 * Construit une Map<tripId, couleur> en tenant compte des groupes.
 * Les trajets d'un même groupe partagent la couleur du groupe.
 * À recalculer quand `groups` change (useMemo).
 */
export const buildGroupColorMap = (groups: TripGroup[]): Map<number, string> => {
  const map = new Map<number, string>()
  groups.forEach(g => {
    const color = groupColorOf(g)
    g.tripIds.forEach(id => map.set(id, color))
  })
  return map
}

export const hasBounds = (t: Trip) => !!(t.startTime && t.endTime)

const sortTrips = (trips: Trip[], sortBy: SortBy, sortDir: SortDir): Trip[] => {
  const dir = sortDir === 'asc' ? 1 : -1
  return [...trips].sort((a, b) => {
    switch (sortBy) {
      case 'distance':
        return (Number(a.distance ?? 0) - Number(b.distance ?? 0)) * dir
      case 'duration':
        return (Number(a.duration ?? 0) - Number(b.duration ?? 0)) * dir
      case 'date':
      default:
        return ((a.startTime ?? '').localeCompare(b.startTime ?? '')) * dir
    }
  })
}

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
    if (from) p.set('from', from)
    if (to) p.set('to', to)
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
    sortBy: 'date' as SortBy,
    sortDir: 'desc' as SortDir,
    trips: [],
    geojsonCache: {},
    loading: false,
    groups: [],
    groupsExpanded: {},
    groupsLoading: false,

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

    setSortBy: (sort) => set(s => {
      const newDir = s.sortBy === sort && s.sortDir === 'desc' ? 'asc' : 'desc'
      return {
        sortBy: sort,
        sortDir: newDir,
        trips: sortTrips(s.trips, sort, newDir),
      }
    }),

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

        const { sortBy, sortDir } = get()
        set({ trips: sortTrips(merged, sortBy, sortDir) })
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

    // ---- Actions groupes ----

    fetchGroups: async () => {
      set({ groupsLoading: true })
      try {
        const res = await apiClient.get('/groups')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const groups: TripGroup[] = await res.json()
        set({ groups })
      } catch (e: any) {
        console.error('fetchGroups error:', e)
      } finally {
        set({ groupsLoading: false })
      }
    },

    createGroup: async (name, tripIds) => {
      const res = await apiClient.post('/groups', { name, tripIds })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await get().fetchGroups()
    },

    renameGroup: async (id, name) => {
      const res = await apiClient.fetchWithRetry(`/groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      set(s => ({
        groups: s.groups.map(g => g.id === id ? { ...g, name } : g)
      }))
    },

    deleteGroup: async (id) => {
      const res = await apiClient.fetchWithRetry(`/groups/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      set(s => ({
        groups: s.groups.filter(g => g.id !== id),
        groupsExpanded: Object.fromEntries(
          Object.entries(s.groupsExpanded).filter(([k]) => Number(k) !== id)
        ),
      }))
    },

    addTripToGroup: async (groupId, tripId) => {
      const res = await apiClient.post(`/groups/${groupId}/trips`, { tripId })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await get().fetchGroups()
    },

    removeTripFromGroup: async (groupId, tripId) => {
      const res = await apiClient.fetchWithRetry(`/groups/${groupId}/trips/${tripId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      set(s => ({
        groups: s.groups.map(g =>
          g.id === groupId
            ? { ...g, tripIds: g.tripIds.filter(id => id !== tripId), tripCount: g.tripCount - 1 }
            : g
        )
      }))
    },

    toggleGroupExpanded: (groupId) => {
      set(s => ({
        groupsExpanded: {
          ...s.groupsExpanded,
          [groupId]: !s.groupsExpanded[groupId],
        }
      }))
    },

    toggleGroupAllSelected: (groupId) => {
      const { groups, trips } = get()
      const group = groups.find(g => g.id === groupId)
      if (!group) return

      const groupTripIds = new Set(group.tripIds)
      const groupTrips = trips.filter(t => t.id != null && groupTripIds.has(t.id as number))
      const anySelected = groupTrips.some(t => t.selected)

      set(s => ({
        trips: s.trips.map(t =>
          t.id != null && groupTripIds.has(t.id as number)
            ? { ...t, selected: !anySelected }
            : t
        )
      }))
    },
  }
})
