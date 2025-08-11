import fs from 'fs/promises'
import path from 'path'
import fetch from 'node-fetch'

const TOKEN_PATH = path.resolve(__dirname, '../../georide_token.json')
const REFRESH_MARGIN_MS = 5 * 24 * 60 * 60 * 1000 // 5 jours en ms

interface TokenData {
  token: string
  expires_at: number // timestamp ms
}

export async function getGeoRideToken(): Promise<string | null> {
  try {
    const raw = await fs.readFile(TOKEN_PATH, 'utf-8')
    const data: TokenData = JSON.parse(raw)
    if (!data.token || !data.expires_at) return null
    return data.token
  } catch {
    return null
  }
}

export async function setGeoRideToken(token: string, expires_at: number) {
  const data: TokenData = { token, expires_at }
  await fs.writeFile(TOKEN_PATH, JSON.stringify(data), 'utf-8')
}

export async function needsRefresh(): Promise<boolean> {
  try {
    const raw = await fs.readFile(TOKEN_PATH, 'utf-8')
    const data: TokenData = JSON.parse(raw)
    const now = Date.now()
    return data.expires_at < now + REFRESH_MARGIN_MS
  } catch {
    return true
  }
}

// Cron: vérifie toutes les 12h si le token doit être refresh

// Rafraîchit le token GeoRide si besoin
setInterval(async () => {
  if (await needsRefresh()) {
    const oldToken = await getGeoRideToken()
    if (!oldToken) {
      console.warn('[GeoRideToken] Impossible de rafraîchir : pas de token existant')
      return
    }
    try {
      const res = await fetch('https://api.georide.com/user/new-token', {
        method: 'GET',
        headers: { Authorization: `Bearer ${oldToken}` },
      })
      if (!res.ok) throw new Error('Erreur lors du refresh token')
      const data = await res.json()
      if (!data.authToken) throw new Error('Réponse inattendue du refresh token')
      const newToken = data.authToken
      const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 jours
      await setGeoRideToken(newToken, expiresAt)
      console.log('[GeoRideToken] Token rafraîchi automatiquement')
    } catch (e) {
      console.error('[GeoRideToken] Erreur lors du refresh automatique', e)
    }
  }
}, 12 * 60 * 60 * 1000)
