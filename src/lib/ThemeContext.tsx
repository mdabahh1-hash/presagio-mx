import React, { createContext, useContext, useEffect, useState } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'veredikt-theme'
const LIGHT_QUERY = '(prefers-color-scheme: light)'
const META_COLORS: Record<ResolvedTheme, string> = { dark: '#07071A', light: '#F7F3EA' }

function readStoredPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* localStorage no disponible */
  }
  return 'system'
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia && window.matchMedia(LIGHT_QUERY).matches ? 'light' : 'dark'
}

function resolve(pref: ThemePreference): ResolvedTheme {
  return pref === 'system' ? systemTheme() : pref
}

function applyTheme(theme: ResolvedTheme) {
  document.documentElement.dataset.theme = theme
  document.getElementById('meta-theme-color')?.setAttribute('content', META_COLORS[theme])
}

interface ThemeContextValue {
  preference: ThemePreference
  resolved: ResolvedTheme
  setPreference: (pref: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference)
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolve(readStoredPreference()))

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, preference)
    } catch {
      /* localStorage no disponible */
    }
    const next = resolve(preference)
    setResolved(next)
    applyTheme(next)

    // En modo system, seguir en vivo los cambios del SO.
    if (preference !== 'system' || !window.matchMedia) return
    const mq = window.matchMedia(LIGHT_QUERY)
    const onChange = (e: MediaQueryListEvent) => {
      const theme: ResolvedTheme = e.matches ? 'light' : 'dark'
      setResolved(theme)
      applyTheme(theme)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [preference])

  return (
    <ThemeContext.Provider value={{ preference, resolved, setPreference: setPreferenceState }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>')
  return ctx
}
