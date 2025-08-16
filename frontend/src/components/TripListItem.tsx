
import TripTimeRange from './TripTimeRange'
import ImportSingleTripButton from './ImportSingleTripButton'
import type { Trip } from '../store/georideStore'

type Props = {
  trip: Trip
  onToggle: (trip: Trip) => void
  color?: string // optionnel: couleur de couche sur la carte
  showImportButton?: boolean
  viewMode?: 'georide' | 'local'
}

export default function TripListItem({ 
  trip, 
  onToggle, 
  color, 
  showImportButton = false, 
  viewMode = 'local' 
}: Props) {
  const km = (trip.distance ?? 0) / 1000
  const mins = Math.round((trip.duration ?? 0) / 60)
  const avg = Math.round(trip.averageSpeed ?? 0)

  return (
    <li
      className={`border rounded-lg p-2 cursor-pointer flex items-center gap-2 transition-colors duration-200 w-full
                 ${trip.selected ? 'bg-blue-100 border-blue-400' : 'bg-white border-gray-200'}
                 hover:bg-blue-50`}
      style={{ width: '100%' }}
      onClick={() => onToggle(trip)}
    >
      {/* Pastille couleur */}
      <span 
        className="inline-block h-3 w-3 rounded-full flex-shrink-0" 
        style={{ background: color || '#6b7280' }} 
      />
      
      {/* Contenu principal */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">
          <TripTimeRange start={trip.startTime} end={trip.endTime} />
        </div>
        <div className="text-xs text-gray-600">
          {km.toFixed(1)} km · {mins} min · {avg} km/h
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {showImportButton && viewMode === 'georide' && (
          <ImportSingleTripButton 
            tripId={trip.id}
            trackerId={trip.trackerId}
            startTime={trip.startTime}
            endTime={trip.endTime}
          />
        )}
        <input
          type="checkbox"
          className="h-4 w-4 accent-blue-600"
          onChange={() => onToggle(trip)}
          checked={!!trip.selected}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </li>
  )
}
