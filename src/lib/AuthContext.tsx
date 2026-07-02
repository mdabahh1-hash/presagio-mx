import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { usersApi, authApi, clearToken, type ApiUser } from './api'
import { getPendingRef, clearPendingRef } from './referral'
import { track } from './analytics'

// Attach a pending referral code to the just-authenticated user. The server only
// accepts it for brand-new users (no prior referrer, no trades yet) and ignores
// self-referrals, so attempting once per load is safe.
async function attachPendingReferral(user: ApiUser): Promise<void> {
  const code = getPendingRef()
  if (!code) return
  if (user.referral_code && code === user.referral_code) { clearPendingRef(); return } // own link
  try {
    const res = await usersApi.attachReferral(code)
    if (res.ok) track('ReferralSignup')
    // Whether accepted or rejected as ineligible, don't retry endlessly.
    if (res.ok || res.reason !== undefined) clearPendingRef()
  } catch {
    /* keep the code for a later attempt */
  }
}

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
      await attachPendingReferral(me)
    } catch (e) {
      setUser(null)
      // Only drop the token on a real auth failure — not on transient network errors.
      if ((e as { status?: number })?.status === 401) clearToken()
    }
  }, [])

  useEffect(() => {
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
