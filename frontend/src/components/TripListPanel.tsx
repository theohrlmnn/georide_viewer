import { useGeoRideStore, colorOf } from '../store/georideStore'
import type { Trip, SortBy } from '../store/georideStore'
import TripListItem from './TripListItem'
import ShowAllTripsToggle from './ShowAllTripsToggle'

const keyOf = (t: Trip, idx: number) =>
  t.id != null ? `t-${t.id}` : `t-${t.trackerId}-${t.startTime}-${t.endTime}-${idx}`

const sortOptions: { value: SortBy; label: string }[] = [
  { value: 'date', label: 'Date' },
  { value: 'distance', label: 'Distance' },
  { value: 'duration', label: 'Duree' },
]

export default function TripListPanel() {
  const viewMode  = useGeoRideStore(s => s.viewMode)
  const trips     = useGeoRideStore(s => s.trips)
  const toggleTrip = useGeoRideStore(s => s.toggleTrip)
  const sortBy    = useGeoRideStore(s => s.sortBy)
  const sortDir   = useGeoRideStore(s => s.sortDir)
  const setSortBy = useGeoRideStore(s => s.setSortBy)

  return (
    <div className="w-full max-w-[420px] flex flex-col space-y-3 h-full min-h-0">
      {/* Réserver l'espace pour le toggle seulement en mode local */}
      {viewMode === 'local' ? (
        <div className="min-h-[68px] shrink-0">
          <ShowAllTripsToggle />
        </div>
      ) : null}

      {/* Boutons de tri */}
      {trips.length > 1 && (
        <div className="flex gap-1 shrink-0">
          {sortOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              className={`px-2 py-1 text-xs rounded transition-colors
                ${sortBy === opt.value
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              {opt.label}
              {sortBy === opt.value && (
                <span className="ml-1">{sortDir === 'desc' ? '\u25BC' : '\u25B2'}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {trips.length === 0 && (
        <p className="text-sm text-gray-200">Aucun trajet</p>
      )}

      {/* Liste qui remplit l'espace disponible */}
      <ul className="space-y-2 overflow-y-auto pr-2 custom-scrollbar min-h-0 flex-1">
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
    </div>
  )
}
