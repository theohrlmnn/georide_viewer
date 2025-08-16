import React, { useState, useEffect } from 'react'

interface DateOnlyPickerProps {
  label: string
  value: string // Format YYYY-MM-DD
  onChange: (value: string) => void
  className?: string
}

export default function DateOnlyPicker({ label, value, onChange, className = '' }: DateOnlyPickerProps) {
  const [inputValue, setInputValue] = useState(value)

  // Synchroniser la valeur interne avec la prop
  useEffect(() => {
    setInputValue(value)
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    onChange(newValue)
  }

  return (
    <div className={`relative ${className}`}>
      <label className="block text-xs font-medium mb-1 text-white/90">
        {label}
      </label>
      
      <input
        type="date"
        value={inputValue}
        onChange={handleInputChange}
        className="w-full border border-gray-600 rounded-lg px-3 py-2 text-sm bg-gray-800 text-white 
                   focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200
                   hover:border-gray-500"
        placeholder="Sélectionner une date..."
      />
    </div>
  )
}
