// src/components/MapView.tsx
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useState } from 'react'
import { useGeoRideStore, cacheKey, colorOf } from '../store/georideStore'
import { resolveBounds } from './TripTimeRange'
import MapStyleSelector, { MAP_STYLES, type MapStyle } from './MapStyleSelector'
import type { LatLngBoundsExpression } from 'leaflet'

type Props = { baseUrl: string; trackerId: number }
const strip = (u: string) => u.replace(/\/+$/, '')

// Composant pour gérer le zoom dynamique de manière sécurisée
function FitBoundsToData({ geojsonData }: { geojsonData: any[] }) {
  const map = useMap()

  useEffect(() => {
    // Vérifications de sécurité
    if (!map || geojsonData.length === 0) return

    try {
      // Calculer les bounds de tous les GeoJSON
      let minLat = Infinity, maxLat = -Infinity
      let minLng = Infinity, maxLng = -Infinity
      let hasValidCoords = false

      const extractCoordinates = (geojson: any) => {
        if (!geojson?.geometry?.coordinates) return

        const coords = geojson.geometry.coordinates
        
        if (geojson.geometry.type === 'LineString') {
          coords.forEach(([lng, lat]: [number, number]) => {
            if (typeof lng === 'number' && typeof lat === 'number' && 
                !isNaN(lng) && !isNaN(lat) && isFinite(lng) && isFinite(lat)) {
              minLat = Math.min(minLat, lat)
              maxLat = Math.max(maxLat, lat)
              minLng = Math.min(minLng, lng)
              maxLng = Math.max(maxLng, lng)
              hasValidCoords = true
            }
          })
        } else if (geojson.geometry.type === 'MultiLineString') {
          coords.forEach((line: [number, number][]) => {
            line.forEach(([lng, lat]: [number, number]) => {
              if (typeof lng === 'number' && typeof lat === 'number' && 
                  !isNaN(lng) && !isNaN(lat) && isFinite(lng) && isFinite(lat)) {
                minLat = Math.min(minLat, lat)
                maxLat = Math.max(maxLat, lat)
                minLng = Math.min(minLng, lng)
                maxLng = Math.max(maxLng, lng)
                hasValidCoords = true
              }
            })
          })
        }
      }

      geojsonData.forEach(geojson => {
        if (geojson.type === 'FeatureCollection') {
          geojson.features?.forEach(extractCoordinates)
        } else if (geojson.type === 'Feature') {
          extractCoordinates(geojson)
        }
      })

      // Si on a des bounds valides, ajuster la vue avec des protections
      if (hasValidCoords && 
          minLat !== Infinity && maxLat !== -Infinity && 
          minLng !== Infinity && maxLng !== -Infinity) {
        
        const latDiff = maxLat - minLat
        const lngDiff = maxLng - minLng
        
        // Éviter les bounds trop petits qui peuvent causer des problèmes
        if (latDiff > 0.001 || lngDiff > 0.001) {
          const bounds: LatLngBoundsExpression = [
            [minLat, minLng],
            [maxLat, maxLng]
          ]
          
          // Attendre que la carte soit stable avant d'appliquer fitBounds
          const timer = setTimeout(() => {
            if (map && map.getContainer()) {
              try {
                // Vérifier que la carte a une taille valide
                const size = map.getSize()
                if (size.x > 0 && size.y > 0) {
                  map.fitBounds(bounds, { 
                    padding: [20, 20],
                    maxZoom: 15,
                    animate: true,
                    duration: 1.0 // Animation plus douce (1 seconde)
                  })
                }
              } catch (error) {
                console.warn('Erreur fitBounds ignorée:', error)
              }
            }
          }, 150) // Délai réduit pour une animation plus réactive

          // Nettoyer le timer si le composant est démonté
          return () => clearTimeout(timer)
        }
      }
    } catch (error) {
      console.warn('Erreur lors du calcul des bounds:', error)
    }
  }, [map, geojsonData])

  return null
}

export default function MapView({ baseUrl, trackerId }: Props) {
  const viewMode      = useGeoRideStore(s => s.viewMode)
  const trips         = useGeoRideStore(s => s.trips)
  const geojsonCache  = useGeoRideStore(s => s.geojsonCache)
  const setGeojsonFor = useGeoRideStore(s => s.setGeojsonFor)
  
  // État pour le style de carte sélectionné
  const [currentMapStyle, setCurrentMapStyle] = useState<MapStyle>(
    MAP_STYLES.find(s => s.id === 'esri-world-topo') || MAP_STYLES[0]
  )

  useEffect(() => {
    const base = strip(baseUrl)
    const toLoad = trips.filter(t => t.selected && !geojsonCache[cacheKey(viewMode, t)])
    
    // console.log('[MapView] useEffect triggered:', {
    //   tripsCount: trips.length,
    //   selectedCount: trips.filter(t => t.selected).length,
    //   toLoadCount: toLoad.length,
    //   viewMode
    // })
    
    if (toLoad.length === 0) return

    ;(async () => {
      for (const t of toLoad) {
        try {
          let url: string
          if (viewMode === 'georide') {
            // Utilise toujours des bornes valides (fallback 24h si manquant)
            const { startIso, endIso } = resolveBounds(t.startTime, t.endTime, 24)
            url = `${base}/georide/trips/${t.id}/geojson?trackerId=${trackerId}&from=${encodeURIComponent(startIso)}&to=${encodeURIComponent(endIso)}`
          } else {
            url = `${base}/trips/${t.id}/geojson`
          }
          
          const res = await fetch(url)
          if (!res.ok) { 
            console.error('[MapView] HTTP Error:', res.status, res.statusText, url)
            continue 
          }
          
          const data = await res.json()
          
          
          const isFeature = data?.type === 'Feature' && data?.geometry
          const isFC = data?.type === 'FeatureCollection' && Array.isArray(data?.features)
          if (!isFeature && !isFC) { 
            console.error('[MapView] Invalid GeoJSON:', data)
            continue 
          }
          
          setGeojsonFor(cacheKey(viewMode, t), data)
        } catch (e) {
          console.error(`[MapView] Error loading trip ${t.id}:`, e)
        }
      }
    })()
  }, [trips, viewMode, baseUrl, trackerId, geojsonCache, setGeojsonFor])

  const selected = trips.filter(t => t.selected)
  
  // Récupérer tous les GeoJSON des trajets sélectionnés
  const visibleGeojsonData = selected
    .map(t => geojsonCache[cacheKey(viewMode, t)])
    .filter(Boolean)

  return (
    <div className="relative w-full h-full">
      <MapContainer center={[46.2, 6.1]} zoom={11} className="w-full h-full" scrollWheelZoom>
        <TileLayer
          key={currentMapStyle.id} // Force le rechargement quand le style change
          url={currentMapStyle.url}
          attribution={currentMapStyle.attribution}
        />
        
        {/* Composant pour le zoom dynamique */}
        <FitBoundsToData geojsonData={visibleGeojsonData} />
        
        {/* Affichage des trajets */}
        {selected.map(t => {
          const k = cacheKey(viewMode, t)
          const gj = geojsonCache[k]
          return gj ? <GeoJSON key={k} data={gj} style={{ color: colorOf(t), weight: 4, opacity: 0.8 }} /> : null
        })}
      </MapContainer>
      
      {/* Sélecteur de style de carte */}
      <div className="absolute top-4 right-4 z-[1000]">
        <MapStyleSelector
          currentStyleId={currentMapStyle.id}
          onStyleChange={setCurrentMapStyle}
        />
      </div>
    </div>
  )
}
