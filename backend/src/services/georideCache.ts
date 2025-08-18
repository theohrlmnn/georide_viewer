// services/georideCache.ts
import { getTripPositions } from './georideClient'
import type { Position } from '../types'

interface CacheEntry {
  positions: Position[]
  timestamp: number
  ttl: number // Time to live en millisecondes
}

class GeoRideCache {
  private cache = new Map<string, CacheEntry>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes
  private readonly MAX_CACHE_SIZE = 100 // Maximum 100 entrées en cache

  private generateKey(trackerId: number, from: string, to: string): string {
    return `${trackerId}:${from}:${to}`
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }

  private cleanup() {
    // Supprimer les entrées expirées
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key)
      }
    }

    // Si le cache est toujours trop grand, supprimer les plus anciennes
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
      
      const toDelete = entries.slice(0, entries.length - this.MAX_CACHE_SIZE)
      toDelete.forEach(([key]) => this.cache.delete(key))
    }
  }

  async getPositions(trackerId: number, from: string, to: string): Promise<Position[]> {
    const key = this.generateKey(trackerId, from, to)
    const cached = this.cache.get(key)

    // Vérifier si on a une entrée valide en cache
    if (cached && !this.isExpired(cached)) {
      console.log(`📦 Cache HIT pour ${key}`)
      return cached.positions
    }

    // Cache miss ou expiré - récupérer depuis GeoRide
    console.log(`🌐 Cache MISS pour ${key} - requête GeoRide`)
    
    try {
      const positions = await getTripPositions(trackerId, from, to)
      
      // Stocker en cache
      this.cache.set(key, {
        positions,
        timestamp: Date.now(),
        ttl: this.DEFAULT_TTL
      })

      // Nettoyer le cache si nécessaire
      this.cleanup()

      console.log(`✅ ${positions.length} positions mises en cache pour ${key}`)
      return positions
    } catch (error) {
      console.error(`❌ Erreur lors de la récupération des positions pour ${key}:`, error)
      throw error
    }
  }

  // Méthodes utilitaires
  getCacheStats() {
    const now = Date.now()
    let validEntries = 0
    let expiredEntries = 0

    for (const entry of this.cache.values()) {
      if (this.isExpired(entry)) {
        expiredEntries++
      } else {
        validEntries++
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      maxSize: this.MAX_CACHE_SIZE,
      ttlMinutes: this.DEFAULT_TTL / (60 * 1000)
    }
  }

  clearCache() {
    this.cache.clear()
    console.log('🧹 Cache GeoRide vidé')
  }

  // Pré-charger des positions (utile pour l'import)
  preloadPositions(trackerId: number, from: string, to: string, positions: Position[]) {
    const key = this.generateKey(trackerId, from, to)
    this.cache.set(key, {
      positions,
      timestamp: Date.now(),
      ttl: this.DEFAULT_TTL
    })
    console.log(`📦 Positions pré-chargées en cache pour ${key}`)
  }
}

// Instance singleton
export const georideCache = new GeoRideCache()

// Export des fonctions utilitaires
export const getCachedPositions = (trackerId: number, from: string, to: string) => 
  georideCache.getPositions(trackerId, from, to)

export const preloadPositionsInCache = (trackerId: number, from: string, to: string, positions: Position[]) =>
  georideCache.preloadPositions(trackerId, from, to, positions)

export const getCacheStats = () => georideCache.getCacheStats()
export const clearGeoRideCache = () => georideCache.clearCache()
