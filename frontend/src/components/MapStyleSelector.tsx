import { useState, useRef } from 'react'
import Dropdown from './Dropdown'

export interface MapStyle {
  id: string
  name: string
  description: string
  url: string
  attribution: string
  category: 'light' | 'dark' | 'satellite' | 'artistic' | 'standard'
}

export const MAP_STYLES: MapStyle[] = [
  {
    id: 'cartodb-light',
    name: 'CartoDB Light',
    description: 'Fond clair et neutre, idéal pour trajets colorés',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors, &copy; CartoDB',
    category: 'light'
  },
  {
    id: 'cartodb-light-nolabels',
    name: 'CartoDB Light (sans labels)',
    description: 'Encore plus minimal, sans noms de lieux',
    url: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors, &copy; CartoDB',
    category: 'light'
  },
  {
    id: 'cartodb-dark',
    name: 'CartoDB Dark',
    description: 'Fond sombre élégant',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors, &copy; CartoDB',
    category: 'dark'
  },
  {
    id: 'osm-standard',
    name: 'OpenStreetMap',
    description: 'Style classique OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    category: 'standard'
  },
  {
    id: 'esri-world-street',
    name: 'ESRI World Street',
    description: 'Style ArcGIS professionnel',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri',
    category: 'standard'
  },
  {
    id: 'esri-world-imagery',
    name: 'ESRI Satellite',
    description: 'Vue satellite haute résolution',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    category: 'satellite'
  },
  {
    id: 'esri-world-topo',
    name: 'ESRI Topographique',
    description: 'Carte topographique détaillée',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri',
    category: 'standard'
  }
]

const CATEGORY_ICONS = {
  light: '☀️',
  dark: '🌙',
  satellite: '🛰️',
  artistic: '🎨',
  standard: '🗺️'
}

const CATEGORY_NAMES = {
  light: 'Clair',
  dark: 'Sombre', 
  satellite: 'Satellite',
  artistic: 'Artistique',
  standard: 'Standard'
}

interface MapStyleSelectorProps {
  currentStyleId: string
  onStyleChange: (style: MapStyle) => void
  className?: string
}

export default function MapStyleSelector({ 
  currentStyleId, 
  onStyleChange, 
  className = '' 
}: MapStyleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  
  const currentStyle = MAP_STYLES.find(s => s.id === currentStyleId) || MAP_STYLES[0]
  
  // Grouper les styles par catégorie
  const stylesByCategory = MAP_STYLES.reduce((acc, style) => {
    if (!acc[style.category]) acc[style.category] = []
    acc[style.category].push(style)
    return acc
  }, {} as Record<string, MapStyle[]>)

  const handleStyleSelect = (style: MapStyle) => {
    onStyleChange(style)
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-800/90 hover:bg-gray-700/90 
                   text-white rounded-lg text-sm font-medium transition-colors duration-200
                   backdrop-blur-sm border border-gray-600/50"
        title="Changer le style de carte"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <span className="hidden sm:inline">{currentStyle.name}</span>
        <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

             <Dropdown
         isOpen={isOpen}
         onClose={() => setIsOpen(false)}
         triggerRef={buttonRef}
         align="right"
         className="w-80"
       >
         <div className="p-2 max-h-96 overflow-y-auto custom-scrollbar">
          <div className="text-xs font-medium text-gray-400 mb-3 px-2">
            Style de carte
          </div>
          
          {Object.entries(stylesByCategory).map(([category, styles]) => (
            <div key={category} className="mb-4">
              <div className="text-xs font-medium text-gray-500 mb-2 px-2 flex items-center gap-1">
                <span>{CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS]}</span>
                {CATEGORY_NAMES[category as keyof typeof CATEGORY_NAMES]}
              </div>
              
              <div className="space-y-1">
                {styles.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => handleStyleSelect(style)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors duration-150 
                               ${style.id === currentStyleId 
                                 ? 'bg-blue-600 text-white' 
                                 : 'text-gray-200 hover:bg-gray-700'
                               }`}
                  >
                    <div className="font-medium">{style.name}</div>
                    <div className="text-xs mt-1 opacity-75">
                      {style.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          
          <div className="mt-4 pt-3 border-t border-gray-600/50">
            <div className="text-xs text-gray-500 px-2">
              💡 <strong>Conseil :</strong> Les styles clairs sont recommandés pour mieux voir les trajets colorés
            </div>
          </div>
        </div>
      </Dropdown>
    </div>
  )
}
