import { useGeoRideStore } from '../store/georideStore'
import { API_BASE_URL } from '../config'

export default function MenuSwitch() {
  const viewMode = useGeoRideStore(s => s.viewMode)
  const setViewMode = useGeoRideStore(s => s.setViewMode)
  const fetchTrips = useGeoRideStore(s => s.fetchTrips)
  const trackerId = useGeoRideStore(s => s.trackerId)

  const handleToggle = () => {
    const newMode = viewMode === 'georide' ? 'local' : 'georide'
    setViewMode(newMode)
    if (newMode === 'georide') fetchTrips(API_BASE_URL, trackerId)
    else fetchTrips(API_BASE_URL)
  }

  return (
    <label htmlFor="switcher" className="flex justify-center cursor-pointer mt-4">
      <div className="relative flex justify-between w-[656px] h-[64px]">
        <input 
          id="switcher" 
          type="checkbox" 
          className="hidden peer" 
          checked={viewMode === 'local'}
          onChange={handleToggle}
        />
        <span className="text-center flex-grow relative z-20 self-center transition text-gray-500 peer-checked:text-white">GeoRide</span>
        <span className="text-center flex-grow relative z-20 self-center transition peer-checked:text-gray-500">Local</span>
        <span className="absolute toggle z-10 bg-white/80 h-[64px] w-[328px] rounded-full transition-all top-0 left-0 peer-checked:left-[calc(100%-328px)]"></span>
      </div>
    </label>
  )
}
