import { useGeoRideStore } from '../store/georideStore'

export default function MenuSwitch() {
  const viewMode = useGeoRideStore(s => s.viewMode)
  const setViewMode = useGeoRideStore(s => s.setViewMode)
  const switchTo = (m: 'georide'|'local') => () => setViewMode(m)

  return (
    <div className="bg-white/80 rounded-full shadow p-2 flex gap-2">
      <button className={`px-3 py-1 rounded-full ${viewMode==='georide'?'bg-blue-600 text-white':'bg-gray-100'}`} onClick={switchTo('georide')}>GeoRide</button>
      <button className={`px-3 py-1 rounded-full ${viewMode==='local'?'bg-blue-600 text-white':'bg-gray-100'}`} onClick={switchTo('local')}>Local</button>
    </div>
  )
}
