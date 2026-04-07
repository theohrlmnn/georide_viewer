import { useGeoRideStore } from '../store/georideStore'

function fmt(val: number, decimals = 1): string {
  return val.toFixed(decimals)
}

function formatDuration(ms: number): string {
  const totalMin = Math.round(ms / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

/** noeuds → km/h */
const kts2kmh = (v: number) => v * 1.852

export default function StatsPanel() {
  const trips = useGeoRideStore(s => s.trips)
  const selected = trips.filter(t => t.selected)

  if (selected.length === 0) return null

  const n = (v: unknown) => Number(v) || 0

  const totalDistanceM = selected.reduce((s, t) => s + n(t.distance), 0)
  const totalDurationMs = selected.reduce((s, t) => s + n(t.duration), 0)

  const avgSpeedKmh = selected.reduce((s, t) => s + kts2kmh(n(t.averageSpeed)), 0) / selected.length
  const maxSpeedKmh = Math.max(...selected.map(t => kts2kmh(n(t.maxSpeed))))

  const maxAngle = Math.max(...selected.map(t => n(t.maxAngle)))
  const avgAngle = selected.reduce((s, t) => s + n(t.averageAngle), 0) / selected.length

  const stats = [
    { label: 'Trajets', value: String(selected.length) },
    { label: 'Distance totale', value: `${fmt(totalDistanceM / 1000)} km` },
    { label: 'Duree totale', value: formatDuration(totalDurationMs) },
    { label: 'Vitesse moy.', value: `${fmt(avgSpeedKmh, 0)} km/h` },
    { label: 'Vitesse max', value: `${fmt(maxSpeedKmh, 0)} km/h` },
    { label: 'Angle max', value: `${fmt(maxAngle, 0)}°` },
    { label: 'Angle moyen', value: `${fmt(avgAngle, 0)}°` },
  ]

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm min-w-[240px]">
      {stats.map(({ label, value }) => (
        <div key={label} className="contents">
          <span className="text-gray-400">{label}</span>
          <span className="text-white font-medium text-right">{value}</span>
        </div>
      ))}
    </div>
  )
}
