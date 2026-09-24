import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

// Bases del concurso mensual (BORRADOR): mismo formato editorial que HowItWorks.
// Los [PENDIENTE] los define Mark; no se enlaza desde el sitio hasta que lo revise.
const SECCIONES = ['metrica', 'elegibilidad', 'abiertos', 'cierre', 'empates', 'descalificacion', 'premios', 'entrega', 'organizador'] as const

export function Bases() {
  const { t } = useTranslation()
  return (
    <div className="page-container anim-1" style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 32px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.015em', margin: '0 0 10px' }}>{t('bases.title')}</h1>
      <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: '0 0 36px', lineHeight: 1.6, maxWidth: 560 }}>{t('bases.intro')}</p>
      <ol style={{ listStyle: 'none', margin: '0 0 40px', padding: 0 }}>
        {SECCIONES.map((k, i) => (
          <li key={k} style={{ display: 'flex', gap: 20, padding: '18px 0', borderTop: '1px solid var(--border-subtle)' }}>
            <span className="num" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-tertiary)', width: 28, flexShrink: 0, paddingTop: 3 }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{t(`bases.${k}Title`)}</h3>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{t(`bases.${k}Body`)}</p>
            </div>
          </li>
        ))}
      </ol>
      <Link to="/clasificacion" className="btn btn-primary btn-lg">{t('bases.cta')}</Link>
    </div>
  )
}
