import React, { useState, useRef } from 'react'
import Dropdown from './Dropdown'

interface TripQuickSearchProps {
  onDateRangeSelect: (startDate: string, endDate: string) => void
  className?: string
}

interface QuickSearchOption {
  label: string
  description: string
  icon: string
  getDateRange: () => { start: string; end: string }
}

const QUICK_SEARCH_OPTIONS: QuickSearchOption[] = [
  {
    label: "Ce matin",
    description: "Trajets depuis 6h00 aujourd'hui",
    icon: "🌅",
    getDateRange: () => {
      const today = new Date()
      const morning = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 6, 0)
      const now = new Date()
      return {
        start: morning.toISOString().slice(0, 16),
        end: now.toISOString().slice(0, 16)
      }
    }
  },
  {
    label: "Hier",
    description: "Tous les trajets d'hier",
    icon: "📅",
    getDateRange: () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const startOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0)
      const endOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59)
      return {
        start: startOfDay.toISOString().slice(0, 16),
        end: endOfDay.toISOString().slice(0, 16)
      }
    }
  },
  {
    label: "Cette semaine",
    description: "Trajets depuis lundi",
    icon: "📆",
    getDateRange: () => {
      const now = new Date()
      const dayOfWeek = now.getDay()
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      const monday = new Date(now.setDate(diff))
      monday.setHours(0, 0, 0, 0)
      const currentTime = new Date()
      return {
        start: monday.toISOString().slice(0, 16),
        end: currentTime.toISOString().slice(0, 16)
      }
    }
  },
  {
    label: "Week-end dernier",
    description: "Samedi et dimanche derniers",
    icon: "🏖️",
    getDateRange: () => {
      const now = new Date()
      const dayOfWeek = now.getDay()
      
      // Calculer le samedi précédent
      let daysToLastSaturday = (dayOfWeek + 1) % 7
      if (daysToLastSaturday === 0) daysToLastSaturday = 7
      
      const lastSaturday = new Date(now)
      lastSaturday.setDate(now.getDate() - daysToLastSaturday)
      lastSaturday.setHours(0, 0, 0, 0)
      
      const lastSunday = new Date(lastSaturday)
      lastSunday.setDate(lastSaturday.getDate() + 1)
      lastSunday.setHours(23, 59, 59, 0)
      
      return {
        start: lastSaturday.toISOString().slice(0, 16),
        end: lastSunday.toISOString().slice(0, 16)
      }
    }
  },
  {
    label: "Trajets longs",
    description: "Dernières 48h, trajets > 30min",
    icon: "🛣️",
    getDateRange: () => {
      const end = new Date()
      const start = new Date(end.getTime() - 48 * 60 * 60 * 1000)
      return {
        start: start.toISOString().slice(0, 16),
        end: end.toISOString().slice(0, 16)
      }
    }
  },
  {
    label: "Trajets courts",
    description: "Dernières 24h, trajets locaux",
    icon: "🏪",
    getDateRange: () => {
      const end = new Date()
      const start = new Date(end.getTime() - 24 * 60 * 60 * 1000)
      return {
        start: start.toISOString().slice(0, 16),
        end: end.toISOString().slice(0, 16)
      }
    }
  }
]

export default function TripQuickSearch({ onDateRangeSelect, className = '' }: TripQuickSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleOptionSelect = (option: QuickSearchOption) => {
    const { start, end } = option.getDateRange()
    onDateRangeSelect(start, end)
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 
                   text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2
                   shadow-lg hover:shadow-xl transform hover:scale-105"
        title="Recherche rapide de trajets"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span>Recherche rapide</span>
        <svg 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        triggerRef={buttonRef}
        className="min-w-80"
      >
        <div className="p-2">
          <div className="text-xs font-medium text-gray-400 mb-3 px-2 flex items-center gap-2">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Recherches suggérées
          </div>
          <div className="space-y-1">
            {QUICK_SEARCH_OPTIONS.map((option, index) => (
              <button
                key={index}
                onClick={() => handleOptionSelect(option)}
                className="w-full text-left px-3 py-3 text-white hover:bg-gray-700 
                           rounded-md transition-colors duration-150 flex items-start gap-3 group"
              >
                <span className="text-lg flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                  {option.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{option.description}</div>
                </div>
                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-600">
            <div className="text-xs text-gray-500 px-2">
              💡 Astuce : Utilisez les presets de dates pour des plages personnalisées
            </div>
          </div>
        </div>
      </Dropdown>
    </div>
  )
}
