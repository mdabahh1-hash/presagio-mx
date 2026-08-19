import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  return (
    <footer style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 56, background: 'var(--bg-surface)' }}>
      <div className="page-container" style={{ paddingTop: 48, paddingBottom: 28 }}>

        {/* Brand */}
        <div style={{ marginBottom: 40 }}>
          <LogoFull />
          <p style={{ margin: '14px 0 0', fontSize: '0.9rem', color: 'var(--text-tertiary)', maxWidth: 420, lineHeight: 1.5 }}>
            {t('footer.tagline')}
          </p>
        </div>

        {/* Columns */}
        <div className="footer-cols" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr', gap: 32 }}>

          {/* Markets by category */}
          <div>
            <div style={colHeader}>{t('footer.categoriesHeader')}</div>
            <div className="footer-cat-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              {CATEGORIES.map(cat => (
                <Link key={cat} to={`/mercados?cat=${encodeURIComponent(cat)}`} style={{ ...colLink, padding: '8px 0' }} className="footer-link">
                  {cat}
                  <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    {t('footer.categorySub')}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Community */}
          <div>
            <div style={colHeader}>{t('footer.community')}</div>
            <a href="#" style={colLink} className="footer-link">X (Twitter)</a>
            <a href="#" style={colLink} className="footer-link">Instagram</a>
            <a href="#" style={colLink} className="footer-link">Discord</a>
            <a href="#" style={colLink} className="footer-link">TikTok</a>
            <a href="mailto:hola@veredikt.mx" style={colLink} className="footer-link">{t('footer.contact')}</a>
            <Link to="/como-funciona" style={colLink} className="footer-link">{t('footer.helpCenter')}</Link>
          </div>

          {/* VEREDIKT */}
          <div>
            <div style={colHeader}>VEREDIKT</div>
            <Link to="/como-funciona" style={colLink} className="footer-link">{t('nav.howItWorks')}</Link>
            <Link to="/clasificacion" style={colLink} className="footer-link">{t('nav.leaderboard')}</Link>
            <Link to="/mercados" style={colLink} className="footer-link">{t('nav.markets')}</Link>
            <Link to="/proponer" style={colLink} className="footer-link">{t('nav.propose')}</Link>
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
            {[t('footer.terms'), t('footer.privacy'), t('footer.integrity')].map(item => (
              <a key={item} href="#" style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textDecoration: 'none' }} className="footer-link">
                {item}
              </a>
            ))}
            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>{t('footer.languageTag')}</span>
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
