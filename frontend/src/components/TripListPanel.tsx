import React, { useEffect } from 'react'
import { useGeoRideStore, colorOf, normalizeKey } from '../store/georideStore'
import type { Trip } from '../store/georideStore'
import TripTimeRange from './TripTimeRange'
import ImportSingleTripButton from './ImportSingleTripButton'
import { API_BASE_URL } from '../config'

const keyOf = (t: Trip, idx: number) =>
  t.id != null ? `t-${t.id}` : `t-${t.trackerId}-${t.startTime}-${t.endTime}-${idx}`

export default function TripListPanel() {
  const viewMode    = useGeoRideStore(s => s.viewMode)
  const dateFrom    = useGeoRideStore(s => s.dateFrom)
  const dateTo      = useGeoRideStore(s => s.dateTo)
  const trackerId   = useGeoRideStore(s => s.trackerId)
  const fetchTrips  = useGeoRideStore(s => s.fetchTrips)
  const resetDateRange = useGeoRideStore(s => s.resetDateRange)

  useEffect(() => {
    if (viewMode === 'georide' && !trackerId) return
    fetchTrips(API_BASE_URL, trackerId)
  }, [viewMode, dateFrom, dateTo, trackerId, fetchTrips])

  const trips = useGeoRideStore(s => s.trips)
  const toggleTrip = useGeoRideStore(s => s.toggleTrip)

  return (
    <div className="bg-white/80 rounded-2xl shadow-xl p-4 max-h-[40vh] overflow-y-auto w-80">
      {trips.length === 0 && <p className="text-sm text-gray-500">Aucun trajet</p>}
      <ul className="space-y-2">
        {trips.map((t, idx) => {
          const km   = (t.distance ?? 0) / 1000
          const mins = Math.round((t.duration ?? 0) / 60)
          const avg  = Math.round(t.averageSpeed ?? 0)
          
          return (
            <li
              key={keyOf(t, idx)}
              className={`border rounded-lg p-2 cursor-pointer flex items-center gap-2 ${t.selected ? 'bg-blue-100 border-blue-400' : 'bg-white'}`}
              onClick={() => toggleTrip(t)}
              title={normalizeKey(t)}
            >
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: colorOf(t) }} />
              <div className="flex-1">
                <div className="text-sm font-medium">
                  <TripTimeRange start={t.startTime} end={t.endTime} />
                </div>
                <div className="text-xs text-gray-600">
                  {km.toFixed(1)} km · {mins} min · {avg} km/h
                </div>
              </div>
              <div className="flex items-center gap-2">
                {viewMode === 'georide' && (
                  <ImportSingleTripButton 
                    tripId={t.id}
                    trackerId={t.trackerId}
                    startTime={t.startTime}
                    endTime={t.endTime}
                  />
                )}
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  onChange={() => toggleTrip(t)}
                  checked={!!t.selected}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
