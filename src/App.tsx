import React from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Home } from './pages/Home'
import { Markets } from './pages/Markets'
import { MarketDetail } from './pages/MarketDetail'
import { Profile } from './pages/Profile'
import { AuthProvider } from './lib/AuthContext'
import { setToken } from './lib/api'

export default function App() {
  return (
    <AuthProvider>
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/mercados" element={<Markets />} />
            <Route path="/mercado/:id" element={<MarketDetail />} />
            <Route path="/perfil" element={<Profile />} />
            {/* OAuth callback is handled in AuthProvider useEffect */}
            <Route path="/auth/callback" element={<AuthCallbackRedirect />} />
          </Routes>
        </main>
        <footer
          style={{
            borderTop: '1px solid var(--border-subtle)',
            padding: '32px 24px',
            marginTop: 32,
            textAlign: 'center',
          }}
        >
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              © 2026 PRESAGIO · Mercado de predicciones con puntos virtuales · No involucra dinero real
            </span>
            <div style={{ display: 'flex', gap: 20 }}>
              {['Términos', 'Privacidad', 'Sobre nosotros', 'API'].map(item => (
                <span key={item} style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', cursor: 'pointer' }}>{item}</span>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </AuthProvider>
  )
}

function AuthCallbackRedirect() {
  const navigate = useNavigate()
  React.useEffect(() => {
    const hash = window.location.hash
    const params = new URLSearchParams(hash.split('?')[1] ?? '')
    const token = params.get('token')
    if (token) setToken(token)
    navigate('/', { replace: true })
  }, [navigate])
  return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Iniciando sesión...</div>
}
