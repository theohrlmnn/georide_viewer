import { useGeoRideStore } from '../store/georideStore'
import { API_BASE_URL } from '../config'

export default function MenuSwitch() {
  const viewMode    = useGeoRideStore(s => s.viewMode)
  const setViewMode = useGeoRideStore(s => s.setViewMode)
  const fetchTrips  = useGeoRideStore(s => s.fetchTrips)
  const trackerId   = useGeoRideStore(s => s.trackerId)

  const switchTo = (m: 'georide'|'local') => () => {
    setViewMode(m)
    if (m === 'georide') fetchTrips(API_BASE_URL, trackerId)
    else fetchTrips(API_BASE_URL)
  }

  return (
    <div className="bg-white/80 rounded-full shadow p-2 flex gap-2">
      <button className={`px-3 py-1 rounded-full ${viewMode==='georide'?'bg-black text-white':'bg-gray-100'}`} onClick={switchTo('georide')}>GeoRide</button>
      <button className={`px-3 py-1 rounded-full ${viewMode==='local'?'bg-black text-white':'bg-gray-100'}`} onClick={switchTo('local')}>Local</button>
    </div>
  )
}
