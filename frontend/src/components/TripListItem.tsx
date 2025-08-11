import React from 'react'
import TripTimeRange from './TripTimeRange'
import type { GeoRideTrip } from '../types/GeoRideTrip'

type Props = {
  trip: GeoRideTrip
  onToggle: (id: number) => void
  color?: string // optionnel: couleur de couche sur la carte
}

export default function TripListItem({ trip, onToggle, color }: Props) {
  const km = (trip.distance ?? 0) / 1000
  const mins = Math.round((trip.duration ?? 0) / 60)

  return (
    <li
      className={`p-3 rounded-lg border transition cursor-pointer
                 ${trip.selected ? 'bg-blue-50 border-blue-300' : 'bg-white/80 border-gray-200'}
                 hover:bg-blue-50`}
      onClick={() => onToggle(trip.id)}
    >
      <div className="flex items-center gap-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={!!trip.selected}
          onChange={() => onToggle(trip.id)}
          onClick={(e) => e.stopPropagation()}
          className="accent-blue-600 h-4 w-4"
          aria-label={`Sélectionner le trajet ${trip.id}`}
        />

        {/* Pastille couleur (optionnelle) */}
        {color && (
          <span
            className="inline-block h-3 w-3 rounded-full ring-1 ring-black/10"
            style={{ backgroundColor: color }}
            aria-hidden
          />
        )}

        {/* Contenu principal */}
        <div className="flex-1 min-w-0">
          <TripTimeRange start={trip.startTime} end={trip.endTime} />
          <div className="text-xs text-gray-600 mt-1 truncate">
            {trip.startTime || 'Départ inconnu'} → {trip.endTime || 'Arrivée inconnue'}
          </div>
        </div>

        {/* Chiffres clés */}
        <div className="text-right text-sm">
          <div className="font-semibold">{km.toFixed(1)} km</div>
          <div className="text-gray-500">{mins} min</div>
        </div>
      </div>
    </li>
  )
}
