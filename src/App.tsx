import React, { Suspense, lazy } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { Home } from './pages/Home'
import { Markets } from './pages/Markets'
import { MarketDetail } from './pages/MarketDetail'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { ThemeProvider } from './lib/ThemeContext'
import { ScrollToTop } from './lib/ScrollToTop'
import { setToken } from './lib/api'
import { consumeReturnTo } from './lib/returnTo'
import { useTranslation } from 'react-i18next'
import './components/leagues/leagues.css'

// Rutas secundarias en chunks propios: Home/Mercados/Detalle cargan de
// inmediato; el resto (admin, ligas, perfil…) se baja al entrar por primera vez.
const Embed = lazy(() => import('./pages/Embed').then(m => ({ default: m.Embed })))
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })))
const Admin = lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })))
const HowItWorks = lazy(() => import('./pages/HowItWorks').then(m => ({ default: m.HowItWorks })))
const Propose = lazy(() => import('./pages/Propose').then(m => ({ default: m.Propose })))
const Leaderboard = lazy(() => import('./pages/Leaderboard').then(m => ({ default: m.Leaderboard })))
const PublicProfile = lazy(() => import('./pages/PublicProfile').then(m => ({ default: m.PublicProfile })))
const Following = lazy(() => import('./pages/Following').then(m => ({ default: m.Following })))
const LeaguesPage = lazy(() => import('./pages/leagues/LeaguesPage').then(m => ({ default: m.LeaguesPage })))
const CreateLeaguePage = lazy(() => import('./pages/leagues/LeaguesPage').then(m => ({ default: m.CreateLeaguePage })))
const InviteLandingPage = lazy(() => import('./pages/leagues/InviteLandingPage'))
const LeagueHomePage = lazy(() => import('./pages/leagues/LeagueHomePage'))

// Fallback vacío con altura: evita el "salto" del footer mientras baja el chunk.
const routeFallback = <div style={{ minHeight: '60vh' }} />

export default function App() {
  const pathname = useLocation().pathname
  // /embed/:id se incrusta en iframes de terceros: sin navbar ni footer.
  const isEmbed = pathname.startsWith('/embed/')
  // /l/:code es la landing pública de invitación a una liga: un solo botón
  // primario, cero navegación de la app, cero distracciones.
  const isInvite = pathname.startsWith('/l/')
  if (isEmbed || isInvite) {
    return (
      <ThemeProvider>
      <AuthProvider>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/embed/:id" element={<Embed />} />
            <Route path="/l/:code" element={<InviteLandingPage />} />
          </Routes>
        </Suspense>
      </AuthProvider>
      </ThemeProvider>
    )
  }
  return (
    <ThemeProvider>
    <AuthProvider>
      <ScrollToTop />
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
        <Navbar />
        <main>
          <Suspense fallback={routeFallback}>
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
              <Route path="/ligas" element={<LeaguesPage />} />
              <Route path="/ligas/crear" element={<CreateLeaguePage />} />
              <Route path="/ligas/:id" element={<LeagueHomePage />} />
              <Route path="/ligas/:id/nuevo-ciclo" element={<CreateLeaguePage />} />
              {/* OAuth callback is handled in AuthProvider useEffect */}
              <Route path="/auth/callback" element={<AuthCallbackRedirect />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </Suspense>
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
    // Si había un returnTo pendiente (p. ej. /l/:code?join=1), volver ahí.
    refreshUser().finally(() => navigate(consumeReturnTo() ?? '/', { replace: true }))
  }, [navigate, refreshUser])
  return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>{t('app.signingIn')}</div>
}
