import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { usersApi, authApi, setToken, clearToken, type ApiUser } from './api'

interface AuthContextValue {
  user: ApiUser | null
  loading: boolean
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  logout: async () => {},
  refreshUser: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const me = await usersApi.me()
      setUser(me)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    // Handle OAuth callback token in URL hash
    const hash = window.location.hash
    if (hash.includes('/auth/callback')) {
      const params = new URLSearchParams(hash.split('?')[1])
      const token = params.get('token')
      if (token) {
        setToken(token)
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
    refreshUser().finally(() => setLoading(false))
  }, [refreshUser])

  const logout = async () => {
    await authApi.logout().catch(() => {})
    clearToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
