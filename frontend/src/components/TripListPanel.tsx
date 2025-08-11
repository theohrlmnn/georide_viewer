import React from 'react'
import { useGeoRideStore } from '../store/georideStore'
import TripTimeRange from './TripTimeRange'
export default function TripListPanel() {
  const trips = useGeoRideStore(s => s.trips)
  const setTrips = useGeoRideStore(s => s.setTrips)

  const toggle = (id: number) => {
    setTrips(trips.map(t => t.id === id ? { ...t, selected: !t.selected } : t))
  }

  return (
    <div className="bg-white/80 rounded-2xl shadow-xl p-4 max-h-[40vh] overflow-y-auto w-80">
      <h2 className="text-lg font-bold mb-2">Trajets</h2>
      {trips.length === 0 && <p className="text-sm text-gray-500">Aucun trajet</p>}
      <ul className="space-y-2">
        {trips.map((t) => (
          <li key={t.id}
            className={`border rounded-lg p-2 cursor-pointer ${t.selected ? 'bg-blue-100 border-blue-400' : 'bg-white'}`}
            onClick={() => toggle(t.id)}>
            <div className="text-sm font-medium">
              <TripTimeRange start={t.start_time} end={t.end_time} />
            </div>
            <div className="text-xs text-gray-600">
              {Math.round(t.distance / 100) / 10} km · {Math.round(t.duration / 60)} min · {Math.round(t.average_speed)} km/h
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
