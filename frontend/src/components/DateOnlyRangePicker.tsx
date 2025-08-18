
import DateOnlyPicker from './DateOnlyPicker'

interface DateOnlyRangePickerProps {
  startValue: string // Format YYYY-MM-DD
  endValue: string   // Format YYYY-MM-DD
  onStartChange: (value: string) => void
  onEndChange: (value: string) => void
  className?: string
}



export default function DateOnlyRangePicker({
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  className = ''
}: DateOnlyRangePickerProps) {

  const formatDuration = () => {
    if (!startValue || !endValue) return ''
    
    try {
      const start = new Date(startValue + 'T00:00:00')
      const end = new Date(endValue + 'T23:59:59')
      const diffMs = end.getTime() - start.getTime()
      const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000))
      
      if (days === 1) return '1 jour'
      return `${days} jours`
    } catch {
      return ''
    }
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-end gap-3">
        <DateOnlyPicker
          label="Date début"
          value={startValue}
          onChange={onStartChange}
          className="flex-1"
        />
        
        <div className="flex-shrink-0 pb-2">
          <div className="text-gray-400 text-lg font-light">→</div>
        </div>
        
        <DateOnlyPicker
          label="Date fin"
          value={endValue}
          onChange={onEndChange}
          className="flex-1"
        />
        

      </div>
      
      {/* Affichage de la durée sélectionnée */}
      {formatDuration() && (
        <div className="mt-2 text-xs text-gray-400 text-center">
          Période sélectionnée : <span className="text-green-400 font-medium">{formatDuration()}</span>
        </div>
      )}
    </div>
  )
}
