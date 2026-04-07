// src/App.tsx
import { useEffect, useState } from 'react'
import MapView from './components/MapView'
import MenuSwitch from './components/MenuSwitch'
import TripListPanel from './components/TripListPanel'
import DateOnlyRangePicker from './components/DateOnlyRangePicker'
import DateRangeStatus from './components/DateRangeStatus'
import TripQuickSearch from './components/TripQuickSearch'
import LoginForm from './components/LoginForm'
import StatsPanel from './components/StatsPanel'

import { useGeoRideStore } from './store/georideStore'
import { API_BASE_URL } from './config'
import { apiClient } from './utils/apiClient'

const trackerId = 2055973
const toIso = (dateStr?: string) => {
  if (!dateStr) return undefined
  return dateStr + 'T00:00:00.000Z'
}

const toDateValue = (iso?: string) => {
  if (!iso) return ''
  if (iso.includes('T')) {
    return iso.slice(0, 10)
  }
  const date = new Date(iso + 'T12:00:00.000Z')
  return date.toISOString().slice(0, 10)
}

type AppState = 'loading' | 'login' | 'ready'

export default function App() {
  const viewMode     = useGeoRideStore(s => s.viewMode)
  const dateFrom     = useGeoRideStore(s => s.dateFrom)
  const dateTo       = useGeoRideStore(s => s.dateTo)
  const fetchTrips   = useGeoRideStore(s => s.fetchTrips)
  const resetGeojson = useGeoRideStore(s => s.resetGeojson)
  const setDateRange = useGeoRideStore(s => s.setDateRange)
  const setTrackerId = useGeoRideStore(s => s.setTrackerId)
  const showAllTrips = useGeoRideStore(s => s.showAllTrips)
  const hasSelected  = useGeoRideStore(s => s.trips.some(t => t.selected))

  const [appState, setAppState] = useState<AppState>('loading')

  useEffect(() => { setTrackerId(trackerId) }, [])

  // Verifier backend + auth au demarrage
  useEffect(() => {
    const init = async () => {
      const backendReady = await apiClient.waitForBackend()
      if (!backendReady) {
        setAppState('loading')
        return
      }

      // Verifier si on est authentifie
      try {
        const res = await apiClient.get('/auth/status')
        if (res.ok) {
          const status = await res.json()
          if (!status.authenticated) {
            setAppState('login')
            return
          }
        }
      } catch {
        // Si le status echoue, on continue (le token .env est peut-etre utilise)
      }

      setAppState('ready')
      resetGeojson()
      fetchTrips(API_BASE_URL)
    }

    init()
  }, [viewMode, dateFrom, dateTo, showAllTrips])

  const handleLoginSuccess = () => {
    setAppState('ready')
    resetGeojson()
    fetchTrips(API_BASE_URL)
  }

  if (appState === 'loading') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Connexion au serveur...</h2>
          <p className="text-gray-400">Veuillez patienter pendant que les services se lancent</p>
        </div>
      </div>
    )
  }

  if (appState === 'login') {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className="h-screen w-screen relative">
      <div className="absolute inset-0">
        <MapView baseUrl={API_BASE_URL} trackerId={trackerId} />
      </div>

      <div className="absolute top-4 bottom-4 left-4 z-[1000] flex flex-col gap-4">
        <div className="bg-gray-900/70 text-white rounded-xl shadow-lg p-3 backdrop-blur-md shrink-0">
          <MenuSwitch />
        </div>

        <div className="bg-gray-900/70 text-white rounded-xl shadow-lg p-4 backdrop-blur-md shrink-0">
          <TripQuickSearch
            onDateRangeSelect={(start, end) => setDateRange(toIso(start), toIso(end))}
          />

          <div className="my-4 border-t border-gray-600/50"></div>

          <DateOnlyRangePicker
            startValue={toDateValue(dateFrom)}
            endValue={toDateValue(dateTo)}
            onStartChange={(value) => {
              const startIso = value ? value + 'T00:00:00.000Z' : undefined
              setDateRange(startIso, dateTo)
            }}
            onEndChange={(value) => {
              const endIso = value ? value + 'T23:59:59.000Z' : undefined
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

        <div className="bg-gray-900/70 text-white rounded-xl shadow-lg p-3 backdrop-blur-md min-h-0 flex-1 overflow-y-auto">
          <TripListPanel />
        </div>
      </div>

      {/* Statistiques des trajets sélectionnés */}
      {hasSelected && (
        <div className="absolute bottom-4 right-4 z-[1000]">
          <div className="bg-gray-900/70 text-white rounded-xl shadow-lg p-4 backdrop-blur-md">
            <StatsPanel />
          </div>
        </div>
      )}
    </div>
  )
}
