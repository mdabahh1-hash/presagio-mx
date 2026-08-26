import React from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Embed } from './pages/Embed'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { Home } from './pages/Home'
import { Markets } from './pages/Markets'
import { MarketDetail } from './pages/MarketDetail'
import { Profile } from './pages/Profile'
import { Admin } from './pages/Admin'
import { HowItWorks } from './pages/HowItWorks'
import { Propose } from './pages/Propose'
import { Leaderboard } from './pages/Leaderboard'
import { PublicProfile } from './pages/PublicProfile'
import { Following } from './pages/Following'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { ThemeProvider } from './lib/ThemeContext'
import { setToken } from './lib/api'
import { useTranslation } from 'react-i18next'

export default function App() {
  // /embed/:id se incrusta en iframes de terceros: sin navbar ni footer.
  const isEmbed = useLocation().pathname.startsWith('/embed/')
  if (isEmbed) {
    return (
      <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/embed/:id" element={<Embed />} />
        </Routes>
      </AuthProvider>
      </ThemeProvider>
    )
  }
  return (
    <ThemeProvider>
    <AuthProvider>
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/mercados" element={<Markets />} />
            <Route path="/mercado/:id" element={<MarketDetail />} />
            <Route path="/perfil" element={<Profile />} />
            <Route path="/siguiendo" element={<Following />} />
            <Route path="/clasificacion" element={<Leaderboard />} />
            <Route path="/como-funciona" element={<HowItWorks />} />
            <Route path="/proponer" element={<Propose />} />
            <Route path="/u/:username" element={<PublicProfile />} />
            {/* OAuth callback is handled in AuthProvider useEffect */}
            <Route path="/auth/callback" element={<AuthCallbackRedirect />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </AuthProvider>
    </ThemeProvider>
  )
}

function AuthCallbackRedirect() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  React.useEffect(() => {
    const hash = window.location.hash
    const params = new URLSearchParams(hash.split('?')[1] ?? '')
    const token = params.get('token')
    if (token) setToken(token)
    // Load the user (and attach any pending referral) before leaving the page.
    refreshUser().finally(() => navigate('/', { replace: true }))
  }, [navigate, refreshUser])
  return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>{t('app.signingIn')}</div>
}
