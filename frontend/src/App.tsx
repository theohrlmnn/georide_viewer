// src/App.tsx
import { useEffect, useState } from 'react'
import MapView from './components/MapView'
import MenuSwitch from './components/MenuSwitch'
import TripListPanel from './components/TripListPanel'
import DateOnlyRangePicker from './components/DateOnlyRangePicker'
import DateRangeStatus from './components/DateRangeStatus'
import TripQuickSearch from './components/TripQuickSearch'

import { useGeoRideStore } from './store/georideStore'
import { API_BASE_URL } from './config'
import { apiClient } from './utils/apiClient'

const trackerId = 2055973
const toIso = (dateStr?: string) => {
  if (!dateStr) return undefined
  // Convertir YYYY-MM-DD vers ISO avec heure de début de journée en UTC
  return dateStr + 'T00:00:00.000Z'
}

const toDateValue = (iso?: string) => {
  if (!iso) return ''
  // Convertir ISO vers YYYY-MM-DD en évitant les problèmes de fuseau horaire
  // Si l'ISO contient déjà une date complète, on prend juste la partie date
  if (iso.includes('T')) {
    return iso.slice(0, 10)
  }
  // Sinon, conversion sécurisée
  const date = new Date(iso + 'T12:00:00.000Z') // Midi UTC pour éviter les décalages
  return date.toISOString().slice(0, 10)
}

export default function App() {
  const viewMode     = useGeoRideStore(s => s.viewMode)
  const dateFrom     = useGeoRideStore(s => s.dateFrom)
  const dateTo       = useGeoRideStore(s => s.dateTo)
  const fetchTrips   = useGeoRideStore(s => s.fetchTrips)
  const resetGeojson = useGeoRideStore(s => s.resetGeojson)
  const setDateRange = useGeoRideStore(s => s.setDateRange)
  const setTrackerId = useGeoRideStore(s => s.setTrackerId)
  
  const [isBackendReady, setIsBackendReady] = useState(false)

  useEffect(() => { setTrackerId(trackerId) }, [])

  useEffect(() => {
    // Attendre que le backend soit disponible avant de charger les données
    const initializeApp = async () => {
      console.log('🔄 Vérification de la disponibilité du backend...')
      const isBackendReady = await apiClient.waitForBackend()
      
      if (isBackendReady) {
        console.log('✅ Backend prêt, chargement des données...')
        setIsBackendReady(true)
        resetGeojson()              // purge le cache des tracés
        fetchTrips(API_BASE_URL)    // recharge la liste selon mode + dates + trackerId (en store)
      } else {
        console.error('❌ Backend non disponible après plusieurs tentatives')
        setIsBackendReady(false)
      }
    }
    
    initializeApp()
  }, [viewMode, dateFrom, dateTo])

  // Affichage de chargement si le backend n'est pas prêt
  if (!isBackendReady) {
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

        {/* Recherche rapide et sélecteur de dates */}
        <div className="bg-gray-900/70 text-white rounded-xl shadow-lg p-4 backdrop-blur-md">
          {/* Recherche rapide */}
          <TripQuickSearch
            onDateRangeSelect={(start, end) => setDateRange(toIso(start), toIso(end))}
          />
          
          {/* Séparateur */}
          <div className="my-4 border-t border-gray-600/50"></div>
          
          {/* Sélecteur de dates précises */}
          <DateOnlyRangePicker
            startValue={toDateValue(dateFrom)}
            endValue={toDateValue(dateTo)}
            onStartChange={(value) => {
              // Pour date début, on prend 00:00:00 en UTC direct
              const startIso = value ? value + 'T00:00:00.000Z' : undefined
              setDateRange(startIso, dateTo)
            }}
            onEndChange={(value) => {
              // Pour date fin, on prend 23:59:59 en UTC direct pour inclure toute la journée
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

        {/* Liste */}
        <div className="bg-gray-900/70 text-white rounded-xl shadow-lg p-3 backdrop-blur-md">
          <TripListPanel />
        </div>
      </div>
    </div>
  )
}
