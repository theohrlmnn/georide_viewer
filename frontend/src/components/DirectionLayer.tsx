import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

type Coord = [number, number] // [lng, lat]

type Props = {
  coordinates: Coord[]
  color: string
}

function bearing(a: Coord, b: Coord): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI
  const dLng = toRad(b[0] - a[0])
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])
  const x = Math.sin(dLng) * Math.cos(lat2)
  const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return (toDeg(Math.atan2(x, y)) + 360) % 360
}

function distanceKm(a: Coord, b: Coord): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6371
  const dLat = toRad(b[1] - a[1])
  const dLng = toRad(b[0] - a[0])
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h = sinLat * sinLat + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * sinLng * sinLng
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

/** Cumulative distance at each coordinate index */
function cumulativeDistances(coords: Coord[]): number[] {
  const dists = [0]
  for (let i = 1; i < coords.length; i++) {
    dists.push(dists[i - 1] + distanceKm(coords[i - 1], coords[i]))
  }
  return dists
}

function extractCoords(geojson: any): Coord[] {
  if (!geojson?.geometry?.coordinates) return []
  if (geojson.geometry.type === 'LineString') return geojson.geometry.coordinates
  if (geojson.geometry.type === 'MultiLineString') return geojson.geometry.coordinates.flat()
  return []
}

export default function DirectionLayer({ coordinates, color }: Props) {
  const map = useMap()

  useEffect(() => {
    if (coordinates.length < 2) return

    const layers: L.Layer[] = []
    const cumDist = cumulativeDistances(coordinates)
    const totalKm = cumDist[cumDist.length - 1]

    // --- Degradé d'épaisseur (fin → épais) ---
    // Découper le tracé en ~20 segments avec une épaisseur croissante
    const segments = 20
    const minWeight = 2
    const maxWeight = 7

    /** Interpolate a point at a given cumulative distance along the route */
    const interpolateAt = (dist: number): L.LatLngExpression => {
      for (let i = 1; i < cumDist.length; i++) {
        if (cumDist[i] >= dist) {
          const segLen = cumDist[i] - cumDist[i - 1]
          const t = segLen > 0 ? (dist - cumDist[i - 1]) / segLen : 0
          const lng = coordinates[i - 1][0] + t * (coordinates[i][0] - coordinates[i - 1][0])
          const lat = coordinates[i - 1][1] + t * (coordinates[i][1] - coordinates[i - 1][1])
          return [lat, lng]
        }
      }
      const last = coordinates[coordinates.length - 1]
      return [last[1], last[0]]
    }

    for (let s = 0; s < segments; s++) {
      const tStart = s / segments
      const tEnd = (s + 1) / segments
      const distStart = tStart * totalKm
      const distEnd = tEnd * totalKm

      // Build segment: interpolated start, interior points, interpolated end
      const pts: L.LatLngExpression[] = [interpolateAt(distStart)]
      for (let i = 0; i < coordinates.length; i++) {
        if (cumDist[i] > distStart && cumDist[i] < distEnd) {
          pts.push([coordinates[i][1], coordinates[i][0]])
        }
      }
      pts.push(interpolateAt(distEnd))
      if (pts.length < 2) continue

      const weight = minWeight + (maxWeight - minWeight) * ((tStart + tEnd) / 2)
      const line = L.polyline(pts, {
        color,
        weight,
        opacity: 0.7,
        lineCap: 'round',
        lineJoin: 'round',
      })
      line.addTo(map)
      layers.push(line)
    }

    // --- Flèches directionnelles denses ---
    const arrowInterval = Math.max(0.15, totalKm / 40)
    let accumulated = 0

    for (let i = 1; i < coordinates.length; i++) {
      const d = distanceKm(coordinates[i - 1], coordinates[i])
      accumulated += d
      if (accumulated >= arrowInterval) {
        const angle = bearing(coordinates[i - 1], coordinates[i])
        const icon = L.divIcon({
          className: '',
          html: `<svg width="12" height="12" viewBox="0 0 12 12" style="transform:rotate(${angle}deg)">
            <path d="M6 1 L10 9 L6 6.5 L2 9 Z" fill="white" fill-opacity="0.9" stroke="${color}" stroke-width="0.5"/>
          </svg>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        })
        const marker = L.marker([coordinates[i][1], coordinates[i][0]], { icon, interactive: false })
        marker.addTo(map)
        layers.push(marker)
        accumulated = 0
      }
    }

    // --- Marqueur depart (vert) ---
    const start = coordinates[0]
    const startMarker = L.circleMarker([start[1], start[0]], {
      radius: 8,
      color: '#fff',
      weight: 2,
      fillColor: '#22c55e',
      fillOpacity: 1,
    })
    startMarker.bindTooltip('Depart', { direction: 'top', offset: [0, -8] })
    startMarker.addTo(map)
    layers.push(startMarker)

    // --- Marqueur arrivee (rouge) ---
    const end = coordinates[coordinates.length - 1]
    const endMarker = L.circleMarker([end[1], end[0]], {
      radius: 8,
      color: '#fff',
      weight: 2,
      fillColor: '#ef4444',
      fillOpacity: 1,
    })
    endMarker.bindTooltip('Arrivee', { direction: 'top', offset: [0, -8] })
    endMarker.addTo(map)
    layers.push(endMarker)

    return () => {
      layers.forEach(l => map.removeLayer(l))
    }
  }, [map, coordinates, color])

  return null
}

export { extractCoords }
