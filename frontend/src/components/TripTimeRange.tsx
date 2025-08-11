import React from 'react'

interface TripTimeRangeProps {
  start: string
  end: string
}

export default function TripTimeRange({ start, end }: { start: string; end: string }) {
  return (
    <div className="text-gray-400 bg-gray-200 font-semibold px-2 py-1 rounded-md">
      {new Date(start).toLocaleString()} → {new Date(end).toLocaleTimeString()}
    </div>
  )
}
