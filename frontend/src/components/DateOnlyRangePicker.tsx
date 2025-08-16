import React, { useState, useRef } from 'react'
import DateOnlyPicker from './DateOnlyPicker'
import Dropdown from './Dropdown'

interface DateOnlyRangePickerProps {
  startValue: string // Format YYYY-MM-DD
  endValue: string   // Format YYYY-MM-DD
  onStartChange: (value: string) => void
  onEndChange: (value: string) => void
  className?: string
}

interface DateRangePreset {
  label: string
  description: string
  getRange: () => { start: string; end: string }
}

const RANGE_PRESETS: DateRangePreset[] = [
  {
    label: "Aujourd'hui",
    description: "Trajets d'aujourd'hui uniquement",
    getRange: () => {
      const today = new Date().toISOString().slice(0, 10)
      return { start: today, end: today }
    }
  },
  {
    label: "Cette semaine",
    description: "Du lundi à dimanche",
    getRange: () => {
      const now = new Date()
      const dayOfWeek = now.getDay()
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      const monday = new Date(now.setDate(diff))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      return { 
        start: monday.toISOString().slice(0, 10), 
        end: sunday.toISOString().slice(0, 10) 
      }
    }
  },
  {
    label: "Ce mois",
    description: "Du 1er au dernier jour du mois",
    getRange: () => {
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return { 
        start: firstDay.toISOString().slice(0, 10),
        end: lastDay.toISOString().slice(0, 10)
      }
    }
  }
]

export default function DateOnlyRangePicker({
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  className = ''
}: DateOnlyRangePickerProps) {
  const [showPresets, setShowPresets] = useState(false)
  const presetsButtonRef = useRef<HTMLButtonElement>(null)

  const handlePresetClick = (preset: DateRangePreset) => {
    const { start, end } = preset.getRange()
    onStartChange(start)
    onEndChange(end)
    setShowPresets(false)
  }

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
        
        <div className="relative flex-shrink-0">
          <button
            ref={presetsButtonRef}
            onClick={() => setShowPresets(!showPresets)}
            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium 
                       transition-colors duration-200 flex items-center gap-2 whitespace-nowrap"
            title="Raccourcis de plages de dates"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Périodes
          </button>
          
          <Dropdown
            isOpen={showPresets}
            onClose={() => setShowPresets(false)}
            triggerRef={presetsButtonRef}
            align="right"
            className="w-72"
          >
            <div className="p-2">
              <div className="text-xs font-medium text-gray-400 mb-2 px-2">Périodes prédéfinies</div>
              <div className="space-y-1">
                {RANGE_PRESETS.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => handlePresetClick(preset)}
                    className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 
                               rounded-md transition-colors duration-150"
                  >
                    <div className="font-medium">{preset.label}</div>
                    <div className="text-xs text-gray-400 mt-1">{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </Dropdown>
        </div>
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
