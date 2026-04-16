import { useState, useRef, useEffect } from 'react'
import type { Trip, TripGroup } from '../store/georideStore'
import TripListItem from './TripListItem'

type Props = {
  group: TripGroup
  groupColor: string      // Couleur commune à tous les trajets du groupe
  expanded: boolean
  trips: Trip[]           // Trajets du groupe présents dans la liste courante
  onToggleExpanded: () => void
  onToggleAllSelected: () => void
  onRename: (name: string) => void
  onDelete: () => void
  onRemoveTrip?: (tripId: number) => void
  onToggleTrip: (trip: Trip) => void
}

export default function TripGroupItem({
  group,
  groupColor,
  expanded,
  trips,
  onToggleExpanded,
  onToggleAllSelected,
  onRename,
  onDelete,
  onRemoveTrip,
  onToggleTrip,
}: Props) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [nameInput, setNameInput] = useState(group.name)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus auto sur le champ renommage
  useEffect(() => {
    if (isRenaming) inputRef.current?.focus()
  }, [isRenaming])

  const handleRenameSubmit = () => {
    const trimmed = nameInput.trim()
    if (trimmed && trimmed !== group.name) onRename(trimmed)
    setIsRenaming(false)
  }

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRenameSubmit()
    if (e.key === 'Escape') { setNameInput(group.name); setIsRenaming(false) }
  }

  // Stats agrégées à partir des trajets visibles dans la liste courante.
  // Number() est nécessaire : distance/duration sont des BIGINT en PG → renvoyés
  // comme strings par pg-node → le "+" ferait de la concaténation sans conversion.
  const visibleDistance = trips.reduce((acc, t) => acc + Number(t.distance ?? 0), 0)
  const visibleDuration = trips.reduce((acc, t) => acc + Number(t.duration ?? 0), 0)
  const km = (visibleDistance / 1000).toFixed(1)
  const totalMin = Math.round(visibleDuration / (1000 * 60))
  const h = Math.floor(totalMin / 60)
  const min = totalMin % 60
  const durationStr = h > 0 ? `${h}h ${min}min` : `${min}min`

  const allSelected = trips.length > 0 && trips.every(t => t.selected)
  const someSelected = trips.some(t => t.selected)

  const visibleCount = trips.length
  const totalCount = group.tripCount

  return (
    <li className="rounded-lg overflow-hidden border border-indigo-300 bg-indigo-50">
      {/* En-tête du groupe */}
      <div
        className={`flex items-center gap-2 p-2 cursor-pointer select-none
          ${allSelected ? 'bg-indigo-200' : someSelected ? 'bg-indigo-100' : 'bg-indigo-50'}
          hover:bg-indigo-100 transition-colors`}
      >
        {/* Pastille couleur du groupe */}
        <span
          className="inline-block h-3 w-3 rounded-full shrink-0 ring-1 ring-white/40"
          style={{ background: groupColor }}
        />

        {/* Bouton expand/collapse */}
        <button
          onClick={onToggleExpanded}
          className="text-indigo-600 hover:text-indigo-800 shrink-0 w-5 text-center leading-none"
          title={expanded ? 'Réduire' : 'Développer'}
        >
          {expanded ? '▼' : '▶'}
        </button>

        {/* Nom du groupe (ou input de renommage) */}
        <div className="flex-1 min-w-0" onClick={onToggleExpanded}>
          {isRenaming ? (
            <input
              ref={inputRef}
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleRenameKeyDown}
              onClick={e => e.stopPropagation()}
              className="w-full text-sm font-semibold text-indigo-900 bg-white border border-indigo-400 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500"
            />
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-semibold text-indigo-900 truncate">{group.name}</span>
              <span className="text-[10px] font-medium text-indigo-500 shrink-0">
                {visibleCount < totalCount
                  ? `${visibleCount}/${totalCount} trajet${totalCount > 1 ? 's' : ''}`
                  : `${totalCount} trajet${totalCount > 1 ? 's' : ''}`}
              </span>
            </div>
          )}

          {/* Stats agrégées */}
          {!isRenaming && visibleCount > 0 && (
            <div className="text-[11px] text-indigo-600">
              {km} km · {durationStr}
            </div>
          )}
          {!isRenaming && visibleCount === 0 && (
            <div className="text-[11px] text-indigo-400 italic">
              Aucun trajet dans la période
            </div>
          )}
        </div>

        {/* Actions groupes */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
          {/* Checkbox sélectionner tout */}
          {visibleCount > 0 && (
            <input
              type="checkbox"
              title="Sélectionner / désélectionner tous les trajets du groupe sur la carte"
              className="h-4 w-4 accent-indigo-600"
              checked={allSelected}
              ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
              onChange={onToggleAllSelected}
            />
          )}

          {/* Renommer */}
          {!isRenaming && !showDeleteConfirm && (
            <button
              title="Renommer le groupe"
              onClick={() => { setNameInput(group.name); setIsRenaming(true) }}
              className="text-indigo-400 hover:text-indigo-700 transition-colors text-xs leading-none"
            >
              ✏️
            </button>
          )}

          {/* Supprimer */}
          {!isRenaming && !showDeleteConfirm && (
            <button
              title="Supprimer le groupe (les trajets restent)"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-300 hover:text-red-600 transition-colors text-xs leading-none"
            >
              🗑️
            </button>
          )}

          {/* Confirmation suppression */}
          {showDeleteConfirm && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-red-600">Supprimer ?</span>
              <button
                onClick={onDelete}
                className="text-[10px] bg-red-500 text-white rounded px-1.5 py-0.5 hover:bg-red-600"
              >
                Oui
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-[10px] bg-gray-300 text-gray-700 rounded px-1.5 py-0.5 hover:bg-gray-400"
              >
                Non
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Trajets du groupe (si déplié) */}
      {expanded && (
        <ul className="space-y-1 p-1 pl-4 border-t border-indigo-200 bg-white/60">
          {trips.length === 0 && (
            <li className="text-xs text-gray-400 italic px-2 py-1">
              Aucun trajet visible dans cette période
            </li>
          )}
          {trips.map((trip, idx) => (
            <div key={trip.id ?? idx} className="flex items-center gap-1">
              <TripListItem
                trip={trip}
                onToggle={onToggleTrip}
                color={groupColor}
                showImportButton={false}
                viewMode="local"
              />
              {/* Bouton retirer du groupe */}
              {onRemoveTrip && trip.id != null && (
                <button
                  title="Retirer du groupe"
                  onClick={() => onRemoveTrip(trip.id as number)}
                  className="shrink-0 text-red-300 hover:text-red-500 text-base leading-none px-1 transition-colors"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </ul>
      )}
    </li>
  )
}
