import { useState } from 'react'
import { API_BASE_URL } from '../config'
import { useGeoRideStore } from '../store/georideStore'

interface ImportSingleTripButtonProps {
  tripId?: number | null
  trackerId?: number | null
  startTime?: string | null
  endTime?: string | null
}

export default function ImportSingleTripButton({ 
  tripId, 
  trackerId, 
  startTime, 
  endTime 
}: ImportSingleTripButtonProps) {
  const [isImporting, setIsImporting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const refreshTrips = useGeoRideStore(s => s.refreshTrips)
  const setViewMode = useGeoRideStore(s => s.setViewMode)

  const handleImport = async () => {
    if (!tripId || !trackerId || !startTime || !endTime) {
      setMessage('Erreur: Données du trajet incomplètes')
      return
    }

    setIsImporting(true)
    setMessage(null)

    try {
      // Utiliser la route existante /trips/import avec les données du trajet
      const response = await fetch(`${API_BASE_URL}/trips/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trackerId,
          from: startTime,
          to: endTime,
        }),
      })

      if (response.ok) {
        await response.json() // Consommer la réponse
        setMessage(`✅ Trajet ${tripId} importé avec succès`)
        
        // Basculer en mode local et rafraîchir pour voir le trajet importé
        setTimeout(() => {
          setViewMode('local')
          refreshTrips()
          setMessage(null)
        }, 1500)
      } else {
        const error = await response.json()
        setMessage(`❌ ${error.error || 'Import échoué'}`)
      }
    } catch (error) {
      setMessage(`❌ Erreur réseau: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    } finally {
      setIsImporting(false)
    }
  }

  if (!tripId) return null

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleImport()
        }}
        disabled={isImporting}
        className={`
          px-2 py-1 text-xs rounded-md font-medium transition-colors
          ${isImporting
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-green-600 text-white hover:bg-green-700'
          }
        `}
        title="Importer ce trajet vers la liste locale"
      >
        {isImporting ? '...' : '📥'}
      </button>
      
      {message && (
        <div className={`
          absolute mt-8 text-xs px-2 py-1 rounded z-10 whitespace-nowrap
          ${message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
        `}>
          {message}
        </div>
      )}
    </div>
  )
}
