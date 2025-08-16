import { useGeoRideStore } from '../store/georideStore'

interface ShowAllTripsToggleProps {
  className?: string
}

export default function ShowAllTripsToggle({ className = '' }: ShowAllTripsToggleProps) {
  const viewMode = useGeoRideStore(s => s.viewMode)
  const showAllTrips = useGeoRideStore(s => s.showAllTrips)
  const setShowAllTrips = useGeoRideStore(s => s.setShowAllTrips)

  // N'afficher cette option qu'en mode local
  if (viewMode !== 'local') {
    return null
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <input
          type="checkbox"
          id="show-all-trips"
          checked={showAllTrips}
          onChange={(e) => setShowAllTrips(e.target.checked)}
          className="h-4 w-4 accent-blue-600 rounded"
        />
        <label 
          htmlFor="show-all-trips" 
          className="text-sm font-medium text-blue-900 cursor-pointer flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span>Afficher tous les trajets</span>
        </label>
        <div className="flex-1"></div>
        <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
          {showAllTrips ? 'Tous les trajets' : 'Filtré par dates'}
        </div>
      </div>
      
      {showAllTrips && (
        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs text-amber-800">
              <strong>Mode tous les trajets :</strong> Affiche tous les trajets de la base de données locale, 
              sans tenir compte des filtres de dates. Idéal pour explorer l'historique complet.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

