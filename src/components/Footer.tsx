import React from 'react'
import { Link } from 'react-router-dom'
import { LogoFull } from './Logo'

const CATEGORIES = [
  'Política MX', 'Economía', 'Deportes', 'Mundial 2026', 'Crypto',
  'Tech', 'Global', 'Entretenimiento', 'México', 'Mercados Globales',
  'Boxeo', 'Motor', 'Clima',
]

const colLink: React.CSSProperties = {
  display: 'block', textDecoration: 'none',
  color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600,
  padding: '6px 0',
}

const colHeader: React.CSSProperties = {
  fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 14,
}

export function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 56, background: 'var(--bg-surface)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px 28px' }}>

        {/* Brand */}
        <div style={{ marginBottom: 40 }}>
          <LogoFull />
          <p style={{ margin: '14px 0 0', fontSize: '0.9rem', color: 'var(--text-tertiary)', maxWidth: 420, lineHeight: 1.5 }}>
            El mercado de predicciones de México.
          </p>
        </div>

        {/* Columns */}
        <div className="footer-cols" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr', gap: 32 }}>

          {/* Markets by category */}
          <div>
            <div style={colHeader}>Mercados por categoría y temas</div>
            <div className="footer-cat-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              {CATEGORIES.map(cat => (
                <Link key={cat} to={`/mercados?cat=${encodeURIComponent(cat)}`} style={{ ...colLink, padding: '8px 0' }} className="footer-link">
                  {cat}
                  <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    Predicciones y cuotas
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Community */}
          <div>
            <div style={colHeader}>Comunidad</div>
            <a href="#" style={colLink} className="footer-link">X (Twitter)</a>
            <a href="#" style={colLink} className="footer-link">Instagram</a>
            <a href="#" style={colLink} className="footer-link">Discord</a>
            <a href="#" style={colLink} className="footer-link">TikTok</a>
            <a href="mailto:hola@veredikt.mx" style={colLink} className="footer-link">Contáctanos</a>
            <Link to="/como-funciona" style={colLink} className="footer-link">Centro de ayuda</Link>
          </div>

          {/* VEREDIKT */}
          <div>
            <div style={colHeader}>VEREDIKT</div>
            <Link to="/como-funciona" style={colLink} className="footer-link">Cómo funciona</Link>
            <Link to="/clasificacion" style={colLink} className="footer-link">Clasificación</Link>
            <Link to="/mercados" style={colLink} className="footer-link">Mercados</Link>
            <Link to="/proponer" style={colLink} className="footer-link">Proponer mercado</Link>
            <a href="#" style={colLink} className="footer-link">API</a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer-bottom" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 16,
          borderTop: '1px solid var(--border-subtle)', marginTop: 40, paddingTop: 24,
        }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
            © 2026 VEREDIKT
          </span>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            {['Términos', 'Privacidad', 'Integridad del mercado'].map(item => (
              <a key={item} href="#" style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textDecoration: 'none' }} className="footer-link">
                {item}
              </a>
            ))}
            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>🌐 Español</span>
          </div>
        </div>

        {/* Disclaimer */}
        <p style={{ margin: '20px 0 0', fontSize: '0.72rem', color: 'var(--text-tertiary)', lineHeight: 1.6, opacity: 0.75 }}>
          VEREDIKT es un mercado de predicciones que opera con puntos virtuales. No involucra
          dinero real ni apuestas con dinero. Solo con fines de entretenimiento.
        </p>
      </div>
    </footer>
  )
}
