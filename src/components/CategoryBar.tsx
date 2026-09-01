import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CATEGORIES } from '../lib/categories'
import { getCategoryColor, getCategoryBg } from '../lib/categoryColors'

const TABS = ['Tendencia', ...CATEGORIES] as const
export type CategoryTab = (typeof TABS)[number]

// Fila horizontal de categorías (Tendencia + CATEGORIES), extraída de Home.
// Dos modos: con onChange filtra in-place (Home); sin onChange cada chip es un
// Link a /mercados — es la barra tipo Polymarket que se muestra en el perfil.
interface Props {
  active?: CategoryTab
  onChange?: (tab: CategoryTab) => void
  style?: React.CSSProperties
}

export function CategoryBar({ active, onChange, style }: Props) {
  const { t } = useTranslation()

  return (
    <div
      className="cat-tabs tabs-scroll anim-1"
      style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 24, ...style }}
    >
      {TABS.map(tab => {
        const isActive = onChange ? tab === active : false
        const color = tab === 'Tendencia' ? 'var(--oro)' : getCategoryColor(tab)
        const activeBg = tab === 'Tendencia' ? 'var(--oro-dim)' : getCategoryBg(tab)
        const label = tab === 'Tendencia' ? t('home.tabTrending') : tab
        const chipStyle: React.CSSProperties = {
          flexShrink: 0,
          background: isActive ? activeBg : 'var(--bg-card)',
          border: `1px solid ${isActive ? color : 'var(--border-subtle)'}`,
          borderRadius: 99, padding: '8px 16px',
          fontSize: '0.82rem', fontWeight: 700,
          color: isActive ? color : 'var(--text-secondary)',
          cursor: 'pointer', fontFamily: 'DM Sans', whiteSpace: 'nowrap',
          transition: 'all 0.15s',
        }
        if (onChange) {
          return (
            <button key={tab} onClick={() => onChange(tab)} style={chipStyle}>
              {label}
            </button>
          )
        }
        const to = tab === 'Tendencia' ? '/mercados' : `/mercados?cat=${encodeURIComponent(tab)}`
        return (
          <Link key={tab} to={to} style={{ ...chipStyle, textDecoration: 'none', display: 'inline-block' }}>
            {label}
          </Link>
        )
      })}
    </div>
  )
}
