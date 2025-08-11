// src/components/MapView.tsx
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { useGeoRideStore } from '../store/georideStore'

type Props = { baseUrl: string; trackerId: number }

export default function MapView({ baseUrl, trackerId }: Props) {
  const viewMode = useGeoRideStore(s => s.viewMode)
  const dateFrom = useGeoRideStore(s => s.dateFrom)
  const dateTo = useGeoRideStore(s => s.dateTo)
  const trips = useGeoRideStore(s => s.trips)
  const geojsonCache = useGeoRideStore(s => s.geojsonCache)
  const setGeojsonFor = useGeoRideStore(s => s.setGeojsonFor)

  useEffect(() => {
    // ne charger que les trajets sélectionnés sans GeoJSON en cache
    const toLoad = trips.filter(t => t.selected && !geojsonCache[t.id])
    if (toLoad.length === 0) return

    // en mode georide, il faut from/to
    if (viewMode === 'georide' && (!dateFrom || !dateTo)) {
      console.warn('[MapView] viewMode=georide mais from/to manquants → pas de fetch')
      return
    }

    ; (async () => {
      for (const t of toLoad) {
        try {

          // sécurité: on saute si les bornes du trip manquent
          if (viewMode === 'georide' && (!t.start_time || !t.end_time)) {
            console.warn('[MapView] trip sans bornes start/end:', t.id)
            continue
          }

          const url =
            viewMode === 'georide'
              ? `${baseUrl}/georide/trips/${t.id}/geojson` +
              `?trackerId=${trackerId}` +
              `&from=${encodeURIComponent(new Date(t.start_time).toISOString())}` +
              `&to=${encodeURIComponent(new Date(t.end_time).toISOString())}`
              : `${baseUrl}/trips/${t.id}/geojson`

          const res = await fetch(url)
          if (!res.ok) { console.error('HTTP', res.status, url); continue }
          const data = await res.json()
          // vérif GeoJSON, puis cache
          const isFeature = data?.type === 'Feature' && data.geometry?.coordinates
          const isFC = data?.type === 'FeatureCollection' && Array.isArray(data.features)
          if (!isFeature && !isFC) { console.error('Non-GeoJSON:', data); continue }
          setGeojsonFor(t.id, data)
        } catch (e) {
          console.error('[MapView] Erreur fetch GeoJSON:', e)
        }
      }
    })()
  }, [trips, viewMode, dateFrom, dateTo, baseUrl, trackerId, geojsonCache, setGeojsonFor])

  return (
    <MapContainer center={[46.2, 6.1]} zoom={11} className="w-full h-full" scrollWheelZoom>
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {trips
        .filter(t => t.selected && geojsonCache[t.id])
        .map(t => (
          <GeoJSON key={t.id} data={geojsonCache[t.id]} style={{ color: 'dodgerblue' }} />
        ))}
    </MapContainer>
  )
}
