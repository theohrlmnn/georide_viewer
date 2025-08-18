// Utilitaire pour gérer les appels API avec retry en cas d'échec
export class ApiClient {
  private baseUrl: string
  private maxRetries: number
  private retryDelay: number

  constructor(baseUrl: string, maxRetries = 5, retryDelay = 2000) {
    this.baseUrl = baseUrl
    this.maxRetries = maxRetries
    this.retryDelay = retryDelay
  }

  async fetchWithRetry(endpoint: string, options?: RequestInit, retryCount = 0): Promise<Response> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, options)
      
      // Si la réponse est OK, la retourner
      if (response.ok) {
        return response
      }
      
      // Si c'est une erreur serveur (5xx) et qu'on peut retry
      if (response.status >= 500 && retryCount < this.maxRetries) {
        console.warn(`API call failed (${response.status}), retrying in ${this.retryDelay}ms... (${retryCount + 1}/${this.maxRetries})`)
        await this.delay(this.retryDelay)
        return this.fetchWithRetry(endpoint, options, retryCount + 1)
      }
      
      // Sinon, retourner la réponse d'erreur
      return response
      
    } catch (error) {
      // Erreur de connexion (backend pas encore prêt)
      if (retryCount < this.maxRetries) {
        console.warn(`Connection failed, retrying in ${this.retryDelay}ms... (${retryCount + 1}/${this.maxRetries})`, error)
        await this.delay(this.retryDelay)
        return this.fetchWithRetry(endpoint, options, retryCount + 1)
      }
      
      // Après tous les retries, lancer l'erreur
      throw error
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Méthodes de convenance
  async get(endpoint: string): Promise<Response> {
    return this.fetchWithRetry(endpoint)
  }

  async post(endpoint: string, data: any): Promise<Response> {
    return this.fetchWithRetry(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
  }

  // Vérifier si le backend est disponible
  async waitForBackend(): Promise<boolean> {
    try {
      const response = await this.fetchWithRetry('/health')
      return response.ok
    } catch (error) {
      console.error('Backend not available after retries:', error)
      return false
    }
  }
}

// Instance par défaut
export const apiClient = new ApiClient('http://localhost:4000')
