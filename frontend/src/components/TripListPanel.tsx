import { useState, useMemo, useEffect, useRef } from 'react'
import { useGeoRideStore, colorOf, groupColorOf, buildGroupColorMap } from '../store/georideStore'
import type { Trip, TripGroup, SortBy } from '../store/georideStore'
import TripListItem from './TripListItem'
import TripGroupItem from './TripGroupItem'
import ShowAllTripsToggle from './ShowAllTripsToggle'

// ── Mini-sélecteur "Ajouter à un groupe" ────────────────────────────────────
function AddToGroupPicker({
  tripId,
  groups,
  onSelect,
  onClose,
}: {
  tripId: number
  groups: TripGroup[]
  onSelect: (groupId: number) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  // Fermer sur clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 bg-gray-800 border border-indigo-500/60
                 rounded-lg shadow-xl overflow-hidden min-w-[160px]"
    >
      <p className="text-[10px] text-gray-400 px-2.5 pt-2 pb-1">Ajouter au groupe</p>
      {groups.map(g => (
        <button
          key={g.id}
          onClick={() => onSelect(g.id)}
          className="w-full text-left text-xs px-2.5 py-1.5 text-gray-200
                     hover:bg-indigo-600/60 transition-colors truncate"
        >
          {g.name}
          <span className="text-gray-400 ml-1">({g.tripCount})</span>
        </button>
      ))}
    </div>
  )
}

const keyOf = (t: Trip, idx: number) =>
  t.id != null ? `t-${t.id}` : `t-${t.trackerId}-${t.startTime}-${t.endTime}-${idx}`

const sortOptions: { value: SortBy; label: string }[] = [
  { value: 'date',     label: 'Date'     },
  { value: 'distance', label: 'Distance' },
  { value: 'duration', label: 'Durée'    },
]

export default function TripListPanel() {
  const viewMode            = useGeoRideStore(s => s.viewMode)
  const trips               = useGeoRideStore(s => s.trips)
  const toggleTrip          = useGeoRideStore(s => s.toggleTrip)
  const sortBy              = useGeoRideStore(s => s.sortBy)
  const sortDir             = useGeoRideStore(s => s.sortDir)
  const setSortBy           = useGeoRideStore(s => s.setSortBy)

  const groups              = useGeoRideStore(s => s.groups)
  const groupsExpanded      = useGeoRideStore(s => s.groupsExpanded)
  const createGroup         = useGeoRideStore(s => s.createGroup)
  const renameGroup         = useGeoRideStore(s => s.renameGroup)
  const deleteGroup         = useGeoRideStore(s => s.deleteGroup)
  const addTripToGroup      = useGeoRideStore(s => s.addTripToGroup)
  const removeTripFromGroup = useGeoRideStore(s => s.removeTripFromGroup)
  const toggleGroupExpanded = useGeoRideStore(s => s.toggleGroupExpanded)
  const toggleGroupAllSelected = useGeoRideStore(s => s.toggleGroupAllSelected)

  // État local du formulaire de création de groupe
  const [newGroupName, setNewGroupName]   = useState('')
  const [createError, setCreateError]     = useState('')
  const [creating, setCreating]           = useState(false)
  const [showGroupForm, setShowGroupForm] = useState(false)

  // Picker "ajouter à un groupe existant"
  const [pickerTripId, setPickerTripId] = useState<number | null>(null)

  // Map tripId → couleur effective (couleur du groupe si groupé, sinon couleur individuelle)
  const groupColorMap = useMemo(() => buildGroupColorMap(groups), [groups])
  const tripColor = (t: Trip) =>
    (t.id != null ? groupColorMap.get(t.id as number) : undefined) ?? colorOf(t)

  const canShowGroups = viewMode === 'local'

  // Trajets sélectionnés qui ont un vrai ID (donc en mode local)
  const selectedLocalTrips = useMemo(
    () => trips.filter(t => t.selected && t.id != null),
    [trips]
  )

  // IDs de tous les trajets déjà dans un groupe
  const groupedTripIds = useMemo(() => {
    const set = new Set<number>()
    groups.forEach(g => g.tripIds.forEach(id => set.add(id)))
    return set
  }, [groups])

  // Trajets sans groupe
  const ungroupedTrips = useMemo(
    () => trips.filter(t => t.id != null && !groupedTripIds.has(t.id as number)),
    [trips, groupedTripIds]
  )

  // Trips par groupe (intersection avec liste courante filtrée)
  const tripsByGroup = useMemo(() => {
    const tripMap = new Map(trips.filter(t => t.id != null).map(t => [t.id as number, t]))
    return groups.map(g => ({
      group: g,
      trips: g.tripIds.map(id => tripMap.get(id)).filter(Boolean) as Trip[],
    }))
  }, [groups, trips])

  // ---- Handlers création de groupe ----
  const handleCreateGroup = async () => {
    const name = newGroupName.trim()
    if (!name) { setCreateError('Donnez un nom au groupe'); return }
    setCreating(true)
    setCreateError('')
    try {
      await createGroup(name, selectedLocalTrips.map(t => t.id as number))
      setNewGroupName('')
      setShowGroupForm(false)
    } catch {
      setCreateError('Erreur lors de la création')
    } finally {
      setCreating(false)
    }
  }

  const handleCancelGroup = () => {
    setShowGroupForm(false)
    setNewGroupName('')
    setCreateError('')
  }

  return (
    <div className="w-full max-w-[420px] flex flex-col space-y-3 h-full min-h-0">

      {/* Toggle "Tous les trajets" (mode local seulement) */}
      {viewMode === 'local' && (
        <div className="min-h-[68px] shrink-0">
          <ShowAllTripsToggle />
        </div>
      )}

      {/* Barre de tri */}
      {trips.length > 1 && (
        <div className="flex gap-1 shrink-0">
          {sortOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value)}
              className={`px-2 py-1 text-xs rounded transition-colors
                ${sortBy === opt.value
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              {opt.label}
              {sortBy === opt.value && (
                <span className="ml-1">{sortDir === 'desc' ? '▼' : '▲'}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Barre "Grouper la sélection" — apparaît quand des trajets locaux sont sélectionnés */}
      {canShowGroups && selectedLocalTrips.length > 0 && (
        <div className="shrink-0 rounded-lg border border-indigo-500/60 bg-indigo-900/40 p-2.5 space-y-2">
          {!showGroupForm ? (
            <button
              onClick={() => setShowGroupForm(true)}
              className="w-full text-xs font-medium text-indigo-200 hover:text-white bg-indigo-600/60 hover:bg-indigo-600 rounded px-3 py-1.5 transition-colors"
            >
              ⊞ Grouper les {selectedLocalTrips.length} trajet{selectedLocalTrips.length > 1 ? 's' : ''} sélectionné{selectedLocalTrips.length > 1 ? 's' : ''}
            </button>
          ) : (
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <input
                  autoFocus
                  type="text"
                  placeholder="Nom du groupe…"
                  value={newGroupName}
                  onChange={e => { setNewGroupName(e.target.value); setCreateError('') }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCreateGroup()
                    if (e.key === 'Escape') handleCancelGroup()
                  }}
                  className="flex-1 text-xs rounded px-2 py-1.5 bg-gray-800 border border-indigo-500 text-white placeholder-gray-400 outline-none focus:border-indigo-300"
                />
                <button
                  onClick={handleCreateGroup}
                  disabled={creating || !newGroupName.trim()}
                  className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors shrink-0"
                >
                  {creating ? '…' : '✓'}
                </button>
                <button
                  onClick={handleCancelGroup}
                  className="px-2 py-1.5 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors shrink-0"
                >
                  ✕
                </button>
              </div>
              {createError && <p className="text-[11px] text-red-400">{createError}</p>}
            </div>
          )}
        </div>
      )}

      {trips.length === 0 && (
        <p className="text-sm text-gray-200">Aucun trajet</p>
      )}

      {/* Liste scrollable */}
      <ul className="space-y-2 overflow-y-auto pr-2 custom-scrollbar min-h-0 flex-1">

        {/* ---- Groupes (mode local seulement) ---- */}
        {canShowGroups && tripsByGroup.map(({ group, trips: gTrips }) => (
          <TripGroupItem
            key={`g-${group.id}`}
            group={group}
            groupColor={groupColorOf(group)}
            expanded={!!groupsExpanded[group.id]}
            trips={gTrips}
            onToggleExpanded={() => toggleGroupExpanded(group.id)}
            onToggleAllSelected={() => toggleGroupAllSelected(group.id)}
            onRename={name => renameGroup(group.id, name)}
            onDelete={() => deleteGroup(group.id)}
            onRemoveTrip={tripId => removeTripFromGroup(group.id, tripId)}
            onToggleTrip={toggleTrip}
          />
        ))}

        {/* Séparateur si groupes + trajets sans groupe coexistent */}
        {canShowGroups && groups.length > 0 && ungroupedTrips.length > 0 && (
          <li className="flex items-center gap-2 py-1">
            <div className="flex-1 border-t border-gray-600/50" />
            <span className="text-[10px] text-gray-400 shrink-0">Sans groupe</span>
            <div className="flex-1 border-t border-gray-600/50" />
          </li>
        )}

        {/* ---- Trajets sans groupe (local) ou tous les trajets (georide) ---- */}
        {(canShowGroups ? ungroupedTrips : trips).map((trip, idx) => {
          const showAddBtn = canShowGroups && groups.length > 0 && trip.id != null
          return (
          <li key={keyOf(trip, idx)} className={`relative${showAddBtn ? ' pl-5' : ''}`}>

            {/* Bouton ⊕ "ajouter à un groupe" — local seulement, quand des groupes existent */}
            {showAddBtn && (
              <button
                title="Ajouter à un groupe existant"
                onClick={e => {
                  e.stopPropagation()
                  setPickerTripId(prev => prev === trip.id ? null : trip.id as number)
                }}
                className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5
                           flex items-center justify-center
                           text-indigo-400 hover:text-indigo-200 text-base leading-none
                           transition-colors"
              >
                ⊕
              </button>
            )}

            <TripListItem
              trip={trip}
              onToggle={toggleTrip}
              color={tripColor(trip)}
              showImportButton={true}
              viewMode={viewMode}
            />

            {/* Dropdown sélecteur de groupe */}
            {pickerTripId === trip.id && (
              <AddToGroupPicker
                tripId={trip.id as number}
                groups={groups}
                onSelect={async groupId => {
                  await addTripToGroup(groupId, trip.id as number)
                  setPickerTripId(null)
                }}
                onClose={() => setPickerTripId(null)}
              />
            )}
          </li>
        )})}
      </ul>
    </div>
  )
}
