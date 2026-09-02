import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LogoFull } from './Logo'
import { Icon } from './Icon'

const link: React.CSSProperties = {
  textDecoration: 'none', color: 'var(--text-tertiary)', fontSize: 13, fontWeight: 500,
}

// Footer de una fila (estilo Polymarket): marca + enlaces reales + idioma.
// Sin columnas, sin cabeceras en mayúsculas, sin redes con href="#".
export function Footer() {
  const { t } = useTranslation()
  return (
    <footer style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 56 }}>
      <div className="page-container" style={{ paddingTop: 28, paddingBottom: 28 }}>
        <div className="footer-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <LogoFull />
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>© 2026</span>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }} aria-label="Footer">
            <Link to="/mercados" style={link} className="footer-link">{t('nav.markets')}</Link>
            <Link to="/como-funciona" style={link} className="footer-link">{t('nav.howItWorks')}</Link>
            <Link to="/clasificacion" style={link} className="footer-link">{t('nav.leaderboard')}</Link>
            <Link to="/ligas" style={link} className="footer-link">{t('nav.leagues')}</Link>
            <Link to="/proponer" style={link} className="footer-link">{t('nav.propose')}</Link>
            <a href="mailto:hola@veredikt.mx" style={link} className="footer-link">{t('footer.contact')}</a>
          </nav>

          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-tertiary)' }}>
            <Icon name="globe" size={14} />
            {t('footer.languageTag')}
          </span>
        </div>

        <p style={{ margin: '18px 0 0', fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6, maxWidth: 720 }}>
          {t('footer.tagline')} {t('footer.disclaimer', { defaultValue: 'VEREDIKT opera con puntos virtuales. No involucra dinero real ni apuestas con dinero. Solo con fines de entretenimiento.' })}
        </p>
      </div>
    </footer>
  )
}
