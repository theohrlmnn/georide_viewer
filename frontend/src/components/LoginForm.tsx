import { useState } from 'react'
import { apiClient } from '../utils/apiClient'

interface LoginFormProps {
  onLoginSuccess: () => void
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await apiClient.post('/auth/login', { email, password })

      if (res.ok) {
        onLoginSuccess()
      } else {
        const data = await res.json()
        setError(data.error || 'Echec de la connexion')
      }
    } catch {
      setError('Impossible de contacter le serveur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gray-900">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm border border-gray-700"
      >
        <h1 className="text-2xl font-bold text-white mb-1 text-center">GeoRide Viewer</h1>
        <p className="text-gray-400 text-sm mb-6 text-center">Connectez-vous avec votre compte GeoRide</p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white
                       focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            placeholder="email@exemple.com"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">Mot de passe</label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white
                       focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            placeholder="Votre mot de passe GeoRide"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2.5 rounded-lg font-medium text-white transition-all
                     ${loading
                       ? 'bg-gray-600 cursor-not-allowed'
                       : 'bg-green-600 hover:bg-green-700 active:scale-[0.98]'
                     }`}
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
    </div>
  )
}
