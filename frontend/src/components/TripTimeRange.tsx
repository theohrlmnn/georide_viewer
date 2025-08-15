// src/components/TripTimeRange.tsx
import React from 'react'

export interface TripTimeRangeProps {
  start?: string | null
  end?: string | null
  /** fenêtre par défaut quand start/end manquent (heures) */
  fallbackHours?: number
  className?: string
}

/**
 * Calcule des bornes sûres pour GeoRide:
 * - si `end` est manquant → now
 * - si `start` est manquant → end - fallbackHours
 * - renvoie les ISO prêtes pour l’API + des Date pour l’affichage
 */
export function resolveBounds(
  start?: string | null,
  end?: string | null,
  fallbackHours = 24
) {
  const isValid = (s?: string | null) => !!s && !Number.isNaN(Date.parse(String(s)))
  const now = new Date()
  const endDate = isValid(end) ? new Date(String(end)) : now
  const startDate = isValid(start)
    ? new Date(String(start))
    : new Date(endDate.getTime() - fallbackHours * 60 * 60 * 1000)

  return {
    startIso: startDate.toISOString(),
    endIso: endDate.toISOString(),
    startDate,
    endDate,
    usedFallback: !isValid(start) || !isValid(end),
  }
}

export default function TripTimeRange({
  start,
  end,
  fallbackHours = 24,
  className = '',
}: TripTimeRangeProps) {
  const { startDate, endDate, usedFallback } = resolveBounds(start, end, fallbackHours)

  const dtDateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' })
  const dtTimeOnly = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' })

  return (
    <div
      className={
        'text-gray-800 bg-gray-200 font-semibold px-2 py-1 rounded-md inline-flex items-center gap-2 ' +
        className
      }
  
    >
      <span>{dtDateTime.format(startDate)}</span>
      <span>→</span>
      <span>{dtTimeOnly.format(endDate)}</span>
    </div>
  )
}
