// src/App.tsx
import { useEffect } from 'react'
import MapView from './components/MapView'
import MenuSwitch from './components/MenuSwitch'
import TripListPanel from './components/TripListPanel'
import DateOnlyRangePicker from './components/DateOnlyRangePicker'
import DateRangeStatus from './components/DateRangeStatus'
import TripQuickSearch from './components/TripQuickSearch'

import { useGeoRideStore } from './store/georideStore'
import { API_BASE_URL } from './config'

const trackerId = 2055973
const toIso = (dateStr?: string) => {
  if (!dateStr) return undefined
  // Convertir YYYY-MM-DD vers ISO avec heure de début/fin de journée
  const date = new Date(dateStr + 'T00:00:00')
  return date.toISOString()
}

const toDateValue = (iso?: string) => {
  if (!iso) return ''
  // Convertir ISO vers YYYY-MM-DD
  return new Date(iso).toISOString().slice(0, 10)
}

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

        {/* Recherche rapide */}
        <div className="bg-gray-900/70 text-white rounded-xl shadow-lg p-3 backdrop-blur-md">
          <TripQuickSearch
            onDateRangeSelect={(start, end) => setDateRange(toIso(start), toIso(end))}
          />
        </div>

        {/* Sélecteur de dates précises */}
        <div className="bg-gray-900/70 text-white rounded-xl shadow-lg p-4 backdrop-blur-md">
          <DateOnlyRangePicker
            startValue={toDateValue(dateFrom)}
            endValue={toDateValue(dateTo)}
            onStartChange={(value) => {
              // Pour date début, on prend 00:00:00
              const startIso = value ? new Date(value + 'T00:00:00').toISOString() : undefined
              setDateRange(startIso, dateTo)
            }}
            onEndChange={(value) => {
              // Pour date fin, on prend 23:59:59 pour inclure toute la journée
              const endIso = value ? new Date(value + 'T23:59:59').toISOString() : undefined
              setDateRange(dateFrom, endIso)
            }}
          />
          <div className="mt-3 pt-3 border-t border-gray-600/50">
            <DateRangeStatus
              startDate={dateFrom}
              endDate={dateTo}
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
