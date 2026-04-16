import { useRef, useState, useCallback, useEffect } from 'react'
import { API_BASE_URL } from '../config'

// ── Types ────────────────────────────────────────────────────────────────────

interface GpxPoint { lat: number; lon: number; time: string }

type Phase =
  | { type: 'idle' }
  | { type: 'dragging'; valid: boolean }
  | { type: 'importing'; pct: number; label: string }
  | { type: 'success'; name: string; points: number; km: number }
  | { type: 'error'; message: string }

// ── Parsing GPX (DOMParser côté navigateur) ──────────────────────────────────

function parseGpx(xml: string): { name: string; points: GpxPoint[]; synthetic: boolean } {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')

  if (doc.querySelector('parsererror')) {
    throw new Error('Fichier GPX invalide (XML mal formé)')
  }

  const name =
    doc.querySelector('trk > name')?.textContent?.trim() ||
    doc.querySelector('rte > name')?.textContent?.trim() ||
    doc.querySelector('metadata > name')?.textContent?.trim() ||
    'Import GPX'

  // Essayer trkpt d'abord, puis rtept (route sans track enregistré)
  let ptEls = Array.from(doc.querySelectorAll('trkpt'))
  if (ptEls.length === 0) ptEls = Array.from(doc.querySelectorAll('rtept'))

  if (ptEls.length < 2) throw new Error('Pas assez de points GPS valides dans ce fichier (minimum 2)')

  // Détecter si les timestamps sont présents
  const hasTime = ptEls.some(el => !!el.querySelector('time')?.textContent?.trim())
  const baseMs  = Date.now()

  const points: GpxPoint[] = []
  ptEls.forEach((el, i) => {
    const lat = parseFloat(el.getAttribute('lat') || '')
    const lon = parseFloat(el.getAttribute('lon') || '')
    if (isNaN(lat) || isNaN(lon)) return

    // Si pas de timestamp : générer un timestamp synthétique (1 s / point)
    const rawTime = el.querySelector('time')?.textContent?.trim()
    const time    = rawTime || new Date(baseMs + i * 1000).toISOString()
    points.push({ lat, lon, time })
  })

  if (points.length < 2) throw new Error('Pas assez de points GPS valides dans ce fichier (minimum 2)')

  return { name, points, synthetic: !hasTime }
}

// ── Composant ────────────────────────────────────────────────────────────────

type Props = {
  children: React.ReactNode
  onImported: () => void
}

export default function GpxDropZone({ children, onImported }: Props) {
  const [phase, setPhase] = useState<Phase>({ type: 'idle' })
  const dragCounter = useRef(0)
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const currentPct = useRef(0)

  // Nettoyage de l'intervalle en cas de démontage
  useEffect(() => () => { if (progressInterval.current) clearInterval(progressInterval.current) }, [])

  // Animation douce vers un pourcentage cible
  const animateTo = useCallback((target: number, durationMs: number, label: string) => {
    if (progressInterval.current) clearInterval(progressInterval.current)
    const start    = currentPct.current
    const startTs  = Date.now()
    progressInterval.current = setInterval(() => {
      const t   = Math.min((Date.now() - startTs) / durationMs, 1)
      const pct = Math.round(start + (target - start) * t)
      currentPct.current = pct
      setPhase({ type: 'importing', pct, label })
      if (t >= 1) { clearInterval(progressInterval.current!); progressInterval.current = null }
    }, 30)
  }, [])

  // ── Upload via XHR ──────────────────────────────────────────────────────

  const upload = useCallback((name: string, points: GpxPoint[]) => {
    const xhr = new XMLHttpRequest()

    // Progression upload (0 → 30 %)
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return
      const pct = Math.round((e.loaded / e.total) * 30)
      currentPct.current = pct
      setPhase({ type: 'importing', pct, label: 'Envoi des données…' })
    }

    // Upload terminé → animer de 30 % à 90 % pendant le traitement serveur
    xhr.upload.onload = () => {
      animateTo(90, 3000, 'Traitement en cours…')
    }

    // Réponse reçue
    xhr.onload = () => {
      if (progressInterval.current) { clearInterval(progressInterval.current); progressInterval.current = null }

      if (xhr.status >= 200 && xhr.status < 300) {
        const result = JSON.parse(xhr.responseText)
        currentPct.current = 100
        setPhase({ type: 'importing', pct: 100, label: 'Import terminé !' })

        setTimeout(() => {
          setPhase({
            type:   'success',
            name,
            points: result.points,
            km:     Math.round(result.distanceMeters / 100) / 10,
          })
          onImported()
          setTimeout(() => setPhase({ type: 'idle' }), 2500)
        }, 400)

      } else {
        const msg = (() => { try { return JSON.parse(xhr.responseText)?.error } catch { return null } })()
        setPhase({ type: 'error', message: msg || `Erreur serveur (${xhr.status})` })
      }
    }

    xhr.onerror = () => {
      if (progressInterval.current) clearInterval(progressInterval.current)
      setPhase({ type: 'error', message: 'Erreur réseau — le backend est-il disponible ?' })
    }

    xhr.open('POST', `${API_BASE_URL}/trips/import/gpx-data`)
    xhr.setRequestHeader('Content-Type', 'application/json')
    xhr.send(JSON.stringify({ name, points }))
  }, [animateTo, onImported])

  // ── Gestion drag & drop ─────────────────────────────────────────────────

  const isFile = (e: React.DragEvent) =>
    Array.from(e.dataTransfer.items).some(i => i.kind === 'file')

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current++
    if (dragCounter.current === 1 && phase.type === 'idle') {
      setPhase({ type: 'dragging', valid: isFile(e) })
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) setPhase({ type: 'idle' })
  }

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault() }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current = 0

    const file = e.dataTransfer.files[0]
    if (!file) { setPhase({ type: 'idle' }); return }

    if (!file.name.toLowerCase().endsWith('.gpx')) {
      setPhase({ type: 'error', message: `"${file.name}" n'est pas un fichier GPX` })
      setTimeout(() => setPhase({ type: 'idle' }), 3000)
      return
    }

    // Lecture et parsing
    currentPct.current = 0
    setPhase({ type: 'importing', pct: 0, label: 'Lecture du fichier…' })

    try {
      const xml = await file.text()
      setPhase({ type: 'importing', pct: 3, label: 'Analyse du fichier GPX…' })
      const { name, points, synthetic } = parseGpx(xml)
      currentPct.current = 5
      const label = synthetic
        ? `${points.toLocaleString()} points (route sans horodatage) — envoi…`
        : `${points.toLocaleString()} points détectés — envoi…`
      setPhase({ type: 'importing', pct: 5, label })
      upload(name, points)
    } catch (err: any) {
      setPhase({ type: 'error', message: err.message })
      setTimeout(() => setPhase({ type: 'idle' }), 4000)
    }
  }

  const dismiss = () => setPhase({ type: 'idle' })

  // ── Rendu des overlays ──────────────────────────────────────────────────

  return (
    <div
      className="relative w-full h-full"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      {/* ── Overlay : drag en cours ── */}
      {phase.type === 'dragging' && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center
                        bg-blue-950/60 backdrop-blur-sm
                        border-4 border-dashed border-blue-400/70 rounded-none
                        pointer-events-none transition-all">
          <div className="text-center select-none">
            <div className="text-6xl mb-4">📍</div>
            <p className="text-white text-xl font-semibold tracking-wide drop-shadow">
              Déposez votre fichier GPX
            </p>
            <p className="text-blue-300 text-sm mt-1">Tous les trackers GPS sont supportés</p>
          </div>
        </div>
      )}

      {/* ── Overlay : import en cours ── */}
      {phase.type === 'importing' && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center
                        bg-gray-950/70 backdrop-blur-md">
          <div className="bg-gray-900/80 border border-gray-700 rounded-2xl shadow-2xl p-8
                          w-[340px] flex flex-col gap-4">
            <p className="text-white font-semibold text-center text-base">Importation GPX</p>

            {/* Barre de progression */}
            <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-[width] duration-300 ease-out"
                style={{ width: `${phase.pct}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-gray-400">
              <span>{phase.label}</span>
              <span className="tabular-nums">{phase.pct} %</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Overlay : succès ── */}
      {phase.type === 'success' && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center
                        bg-gray-950/60 backdrop-blur-sm">
          <div className="bg-gray-900/90 border border-green-600/50 rounded-2xl shadow-2xl p-8
                          w-[340px] flex flex-col gap-3 text-center">
            <div className="text-4xl">✅</div>
            <p className="text-white font-semibold text-base">{phase.name}</p>
            <p className="text-green-400 text-sm">
              {phase.points.toLocaleString()} points · {phase.km} km
            </p>
            <p className="text-gray-400 text-xs">Trajet ajouté en base de données</p>
          </div>
        </div>
      )}

      {/* ── Overlay : erreur ── */}
      {phase.type === 'error' && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center
                        bg-gray-950/60 backdrop-blur-sm"
             onClick={dismiss}>
          <div className="bg-gray-900/90 border border-red-600/50 rounded-2xl shadow-2xl p-8
                          w-[340px] flex flex-col gap-3 text-center">
            <div className="text-4xl">❌</div>
            <p className="text-white font-semibold text-base">Erreur d'import</p>
            <p className="text-red-400 text-sm">{phase.message}</p>
            <p className="text-gray-500 text-xs">Cliquez pour fermer</p>
          </div>
        </div>
      )}
    </div>
  )
}
