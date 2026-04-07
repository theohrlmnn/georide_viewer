import fs from 'fs/promises'
import path from 'path'
import fetch from 'node-fetch'
import logger from '../utils/logger'

const TOKEN_PATH = path.resolve(__dirname, '../../georide_token.json')
const REFRESH_MARGIN_MS = 5 * 24 * 60 * 60 * 1000 // 5 jours
const CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000      // 12 heures
const TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000  // 30 jours

const BASE_URL = 'https://api.georide.com'

interface TokenData {
  authToken: string
  expiresAt: number // timestamp ms
}

// ---- Persistance du token ----

async function readTokenFile(): Promise<TokenData | null> {
  try {
    const raw = await fs.readFile(TOKEN_PATH, 'utf-8')
    const data = JSON.parse(raw) as TokenData
    if (!data.authToken || !data.expiresAt) return null
    return data
  } catch {
    return null
  }
}

async function writeTokenFile(data: TokenData): Promise<void> {
  await fs.writeFile(TOKEN_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

// ---- API GeoRide ----

async function refreshToken(currentToken: string): Promise<string> {
  logger.info('Refresh du token GeoRide...')

  const res = await fetch(`${BASE_URL}/user/new-token`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${currentToken}` },
  })

  if (!res.ok) {
    throw new Error(`Refresh token GeoRide echoue : HTTP ${res.status}`)
  }

  const data = await res.json() as { authToken: string }
  if (!data.authToken) throw new Error('Reponse refresh GeoRide sans authToken')

  const tokenData: TokenData = {
    authToken: data.authToken,
    expiresAt: Date.now() + TOKEN_LIFETIME_MS,
  }
  await writeTokenFile(tokenData)
  logger.info('Token GeoRide refresh et sauvegarde')

  return data.authToken
}

// ---- API publique ----

/**
 * Login via l'UI : recoit email/password, appelle GeoRide, stocke le token.
 */
export async function login(email: string, password: string): Promise<{ authToken: string }> {
  const res = await fetch(`${BASE_URL}/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    const status = res.status
    if (status === 403) throw new Error('Identifiants invalides')
    throw new Error(`Login GeoRide echoue : HTTP ${status}`)
  }

  const data = await res.json() as { authToken: string }
  if (!data.authToken) throw new Error('Reponse login GeoRide sans authToken')

  await writeTokenFile({
    authToken: data.authToken,
    expiresAt: Date.now() + TOKEN_LIFETIME_MS,
  })
  logger.info('Token GeoRide obtenu par login UI et sauvegarde')

  return { authToken: data.authToken }
}

/**
 * Retourne un token valide :
 * 1. Token fichier + refresh si necessaire
 * 2. Erreur si aucun token (l'utilisateur doit enregistrer un token via l'UI)
 */
export async function getToken(): Promise<string> {
  const stored = await readTokenFile()
  if (!stored) {
    throw new Error('Non authentifie. Connectez-vous via l\'interface.')
  }

  const remaining = stored.expiresAt - Date.now()

  // Encore valide, pas besoin de refresh
  if (remaining > REFRESH_MARGIN_MS) {
    return stored.authToken
  }

  // Proche de l'expiration → refresh
  if (remaining > 0) {
    try {
      return await refreshToken(stored.authToken)
    } catch {
      throw new Error('Token expire et refresh echoue. Reconnectez-vous.')
    }
  }

  throw new Error('Token expire. Reconnectez-vous via l\'interface.')
}

/**
 * Retourne le statut d'authentification (pour l'UI).
 */
export async function getAuthStatus(): Promise<{
  authenticated: boolean
  expiresAt?: number
  remainingDays?: number
}> {
  const stored = await readTokenFile()
  if (!stored || stored.expiresAt < Date.now()) {
    return { authenticated: false }
  }

  const remainingMs = stored.expiresAt - Date.now()
  return {
    authenticated: true,
    expiresAt: stored.expiresAt,
    remainingDays: Math.round(remainingMs / (24 * 60 * 60 * 1000)),
  }
}

/**
 * Supprime le token (logout).
 */
export async function logout(): Promise<void> {
  try {
    const stored = await readTokenFile()
    if (stored) {
      // Revoquer le token cote GeoRide
      await fetch(`${BASE_URL}/user/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${stored.authToken}` },
      }).catch(() => {}) // best-effort
    }
    await fs.unlink(TOKEN_PATH).catch(() => {})
    logger.info('Logout : token supprime')
  } catch {
    // ignore
  }
}

/**
 * Cron de refresh automatique (toutes les 12h).
 */
async function checkAndRefresh(): Promise<void> {
  try {
    const stored = await readTokenFile()
    if (!stored) return // pas de token = pas connecte, rien a faire

    const remaining = stored.expiresAt - Date.now()
    if (remaining > 0 && remaining < REFRESH_MARGIN_MS) {
      logger.info(`Token expire dans ${Math.round(remaining / (24 * 60 * 60 * 1000))}j, refresh...`)
      await refreshToken(stored.authToken)
    }
  } catch (e) {
    logger.error('Erreur lors du refresh automatique du token', e)
  }
}

export function startTokenCron(): void {
  checkAndRefresh()
  setInterval(checkAndRefresh, CHECK_INTERVAL_MS)
  logger.info('Cron de refresh token GeoRide demarre (toutes les 12h)')
}
