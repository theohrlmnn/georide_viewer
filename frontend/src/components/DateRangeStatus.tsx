import React from 'react'

interface DateRangeStatusProps {
  startDate?: string
  endDate?: string
  className?: string
}

export default function DateRangeStatus({ startDate, endDate, className = '' }: DateRangeStatusProps) {
  if (!startDate && !endDate) {
    return (
      <div className={`flex items-center gap-2 text-xs text-gray-400 ${className}`}>
        <div className="w-2 h-2 rounded-full bg-gray-500"></div>
        <span>Aucun filtre de date actif</span>
      </div>
    )
  }

  const formatRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      
      if (diffMs < 60 * 1000) return 'à l\'instant'
      if (diffMs < 60 * 60 * 1000) return `il y a ${Math.floor(diffMs / (60 * 1000))} min`
      if (diffMs < 24 * 60 * 60 * 1000) return `il y a ${Math.floor(diffMs / (60 * 60 * 1000))}h`
      if (diffMs < 7 * 24 * 60 * 60 * 1000) return `il y a ${Math.floor(diffMs / (24 * 60 * 60 * 1000))}j`
      
      return date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      })
    } catch {
      return dateStr
    }
  }

  const getDuration = () => {
    if (!startDate || !endDate) return null
    
    try {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const diffMs = end.getTime() - start.getTime()
      
      if (diffMs < 60 * 60 * 1000) {
        const minutes = Math.round(diffMs / (60 * 1000))
        return `${minutes} min`
      } else if (diffMs < 24 * 60 * 60 * 1000) {
        const hours = Math.round(diffMs / (60 * 60 * 1000))
        return `${hours}h`
      } else {
        const days = Math.round(diffMs / (24 * 60 * 60 * 1000))
        return `${days}j`
      }
    } catch {
      return null
    }
  }

  const duration = getDuration()

  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
      <div className="flex items-center gap-1 text-blue-400">
        {startDate && (
          <span>Depuis {formatRelativeTime(startDate)}</span>
        )}
        {startDate && endDate && <span>•</span>}
        {endDate && (
          <span>Jusqu'à {formatRelativeTime(endDate)}</span>
        )}
        {duration && (
          <span className="ml-1 px-2 py-0.5 bg-blue-500/20 rounded text-blue-300">
            {duration}
          </span>
        )}
      </div>
    </div>
  )
}
