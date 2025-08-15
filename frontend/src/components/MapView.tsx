// src/components/MapView.tsx
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { useGeoRideStore, cacheKey, colorOf } from '../store/georideStore'
import { resolveBounds } from './TripTimeRange'

type Props = { baseUrl: string; trackerId: number }
const strip = (u: string) => u.replace(/\/+$/, '')

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

  return (
    <MapContainer center={[46.2, 6.1]} zoom={11} className="w-full h-full" scrollWheelZoom>
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {selected.map(t => {
        const k = cacheKey(viewMode, t)
        const gj = geojsonCache[k]
        return gj ? <GeoJSON key={k} data={gj} style={{ color: colorOf(t), weight: 3 }} /> : null
      })}
    </MapContainer>
  )
}
