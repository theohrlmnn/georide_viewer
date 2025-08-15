// src/App.tsx
import React, { useEffect } from 'react'
import MapView from './components/MapView'
import MenuSwitch from './components/MenuSwitch'
import TripListPanel from './components/TripListPanel'
import { useGeoRideStore } from './store/georideStore'
import { API_BASE_URL } from './config'

const trackerId = 2055973
const toIso = (v?: string) => (v ? new Date(v).toISOString() : undefined)
const toInputValue = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 16) : '')

export default function App() {
  const viewMode     = useGeoRideStore(s => s.viewMode)
  const dateFrom     = useGeoRideStore(s => s.dateFrom)
  const dateTo       = useGeoRideStore(s => s.dateTo)
  const fetchTrips   = useGeoRideStore(s => s.fetchTrips)
  const resetGeojson = useGeoRideStore(s => s.resetGeojson)
  const setDateRange = useGeoRideStore(s => s.setDateRange)
  const setTrackerId = useGeoRideStore(s => s.setTrackerId)

  useEffect(() => { setTrackerId(trackerId) }, [])

  useEffect(() => {
    resetGeojson()              // purge le cache des tracés
    fetchTrips(API_BASE_URL)    // recharge la liste selon mode + dates + trackerId (en store)
  }, [viewMode, dateFrom, dateTo])

  return (
    <div className="h-screen w-screen relative">
      <div className="absolute inset-0">
        <MapView baseUrl={API_BASE_URL} trackerId={trackerId} />
      </div>

      <div className="absolute bottom-4 left-4 z-[1000] flex flex-col gap-4">
        {/* Switch toujours en haut */}
        <div className="bg-gray-900/70 text-white rounded-xl shadow-lg p-3 backdrop-blur-md">
          <MenuSwitch />
        </div>

        {/* Filtres date */}
        <div className="bg-gray-900/70 text-white rounded-xl shadow-lg p-3 backdrop-blur-md flex items-end gap-3">
          <div className="flex flex-col">
            <label className="text-xs font-medium mb-1">Date début</label>
            <input
              type="datetime-local"
              className="border border-gray-700 rounded px-2 py-1 text-sm bg-gray-800 text-white"
              value={toInputValue(dateFrom)}
              onChange={(e) => setDateRange(toIso(e.target.value), dateTo)}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium mb-1">Date fin</label>
            <input
              type="datetime-local"
              className="border border-gray-700 rounded px-2 py-1 text-sm bg-gray-800 text-white"
              value={toInputValue(dateTo)}
              onChange={(e) => setDateRange(dateFrom, toIso(e.target.value))}
            />
          </div>
        </div>

        {/* Liste */}
        <div className="bg-gray-900/70 text-white rounded-xl shadow-lg p-3 backdrop-blur-md">
          <TripListPanel />
        </div>
      </div>
    </div>
  )
}
