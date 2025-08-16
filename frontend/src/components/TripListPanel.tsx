import { useEffect } from 'react'
import { useGeoRideStore, colorOf } from '../store/georideStore'
import type { Trip } from '../store/georideStore'
import TripListItem from './TripListItem'
import ShowAllTripsToggle from './ShowAllTripsToggle'
import { API_BASE_URL } from '../config'

const keyOf = (t: Trip, idx: number) =>
  t.id != null ? `t-${t.id}` : `t-${t.trackerId}-${t.startTime}-${t.endTime}-${idx}`

export default function TripListPanel() {
  const viewMode    = useGeoRideStore(s => s.viewMode)
  const dateFrom    = useGeoRideStore(s => s.dateFrom)
  const dateTo      = useGeoRideStore(s => s.dateTo)
  const trackerId   = useGeoRideStore(s => s.trackerId)
  const showAllTrips = useGeoRideStore(s => s.showAllTrips)
  const fetchTrips  = useGeoRideStore(s => s.fetchTrips)

  useEffect(() => {
    if (viewMode === 'georide' && !trackerId) return
    fetchTrips(API_BASE_URL, trackerId)
  }, [viewMode, dateFrom, dateTo, trackerId, showAllTrips, fetchTrips])

  const trips = useGeoRideStore(s => s.trips)
  const toggleTrip = useGeoRideStore(s => s.toggleTrip)

  return (
    <div className="w-full flex flex-col space-y-3">
      <ShowAllTripsToggle />

      {trips.length === 0 && (
        <p className="text-sm text-gray-200">Aucun trajet</p>
      )}
      
      {/* Liste avec hauteur max et scroll stylé */}
      <div className="relative">
        <ul className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
          {trips.map((trip, idx) => (
            <TripListItem
              key={keyOf(trip, idx)}
              trip={trip}
              onToggle={toggleTrip}
              color={colorOf(trip)}
              showImportButton={true}
              viewMode={viewMode}
            />
          ))}
        </ul>
        
        {/* Indicateur de scroll si nécessaire */}
        {trips.length > 5 && (
          <div className="absolute -right-1 top-2 text-gray-400 text-xs scroll-indicator">
            <div className="flex flex-col items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              <div className="w-px h-4 bg-gray-600"></div>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
