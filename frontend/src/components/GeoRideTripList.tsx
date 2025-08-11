import React from 'react'
import { useGeoRideStore } from '../store/georideStore'
import TripListItem from './TripListItem'

export default function GeoRideTripList() {
  const trips = useGeoRideStore((s) => s.trips)
  const toggleTripSelection = useGeoRideStore((s) => s.toggleTrip)

  return (
    <div className="bg-gray-900/70 text-white rounded-xl p-4 shadow-lg backdrop-blur-md w-80">
      <h2 className="text-lg font-bold mb-3">Trajets</h2>

      {trips.length === 0 ? (
        <p className="text-sm text-gray-300">Aucun trajet à afficher.</p>
      ) : (
        <ul className="space-y-2">
          {trips.map((trip) => (
            <TripListItem
              key={trip.id}
              trip={trip}
              onToggle={toggleTripSelection}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
