// src/components/MapView.tsx
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { useGeoRideStore, cacheKey, colorOf } from '../store/georideStore'
import { resolveBounds } from './TripTimeRange'
import type { LatLngBoundsExpression } from 'leaflet'

type Props = { baseUrl: string; trackerId: number }
const strip = (u: string) => u.replace(/\/+$/, '')

// Composant pour gérer le zoom dynamique
function FitBoundsToData({ geojsonData }: { geojsonData: any[] }) {
  const map = useMap()

  useEffect(() => {
    if (geojsonData.length === 0) return

    // Calculer les bounds de tous les GeoJSON
    let minLat = Infinity, maxLat = -Infinity
    let minLng = Infinity, maxLng = -Infinity

    const extractCoordinates = (geojson: any) => {
      if (!geojson?.geometry?.coordinates) return

      const coords = geojson.geometry.coordinates
      
      if (geojson.geometry.type === 'LineString') {
        coords.forEach(([lng, lat]: [number, number]) => {
          minLat = Math.min(minLat, lat)
          maxLat = Math.max(maxLat, lat)
          minLng = Math.min(minLng, lng)
          maxLng = Math.max(maxLng, lng)
        })
      } else if (geojson.geometry.type === 'MultiLineString') {
        coords.forEach((line: [number, number][]) => {
          line.forEach(([lng, lat]: [number, number]) => {
            minLat = Math.min(minLat, lat)
            maxLat = Math.max(maxLat, lat)
            minLng = Math.min(minLng, lng)
            maxLng = Math.max(maxLng, lng)
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

    // Si on a des bounds valides, ajuster la vue
    if (minLat !== Infinity && maxLat !== -Infinity && minLng !== Infinity && maxLng !== -Infinity) {
      const bounds: LatLngBoundsExpression = [
        [minLat, minLng],
        [maxLat, maxLng]
      ]
      
      // Ajouter un padding pour que les trajets ne soient pas collés aux bords
      map.fitBounds(bounds, { padding: [20, 20] })
    }
  }, [map, geojsonData])

  return null
}

export default function MapView({ baseUrl, trackerId }: Props) {
  const viewMode      = useGeoRideStore(s => s.viewMode)
  const trips         = useGeoRideStore(s => s.trips)
  const geojsonCache  = useGeoRideStore(s => s.geojsonCache)
  const setGeojsonFor = useGeoRideStore(s => s.setGeojsonFor)

  useEffect(() => {
    const base = strip(baseUrl)
    const toLoad = trips.filter(t => t.selected && !geojsonCache[cacheKey(viewMode, t)])
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
          if (!res.ok) { console.error('[MapView] HTTP', res.status, url); continue }
          const data = await res.json()
          const isFeature = data?.type === 'Feature' && data?.geometry
          const isFC = data?.type === 'FeatureCollection' && Array.isArray(data?.features)
          if (!isFeature && !isFC) { console.error('[MapView] Non‑GeoJSON', data); continue }
          setGeojsonFor(cacheKey(viewMode, t), data)
        } catch (e) {
          console.error('[MapView] fetch geojson error', e)
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
    <MapContainer center={[46.2, 6.1]} zoom={11} className="w-full h-full" scrollWheelZoom>
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* Composant pour le zoom dynamique */}
      <FitBoundsToData geojsonData={visibleGeojsonData} />
      
      {/* Affichage des trajets */}
      {selected.map(t => {
        const k = cacheKey(viewMode, t)
        const gj = geojsonCache[k]
        return gj ? <GeoJSON key={k} data={gj} style={{ color: colorOf(t), weight: 3 }} /> : null
      })}
    </MapContainer>
  )
}
