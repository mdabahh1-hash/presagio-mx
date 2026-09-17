import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '../Icon'
import { LeagueMark } from './LeagueMark'
import { formatVolume } from '../../lib/format'

export interface LigaCard {
  sub: string
  abiertos: number
  volumen: number
}

interface LigasRailProps {
  ligas: LigaCard[]
  active: string | null
  onSelect: (sub: string | null) => void
  // Control extra a la derecha de la cabecera (el popover "Filtros")
  extra?: React.ReactNode
}

const SCROLL_STEP = 368  // dos tarjetas (178 + 10)

// Riel horizontal de ligas con logo oficial: scroll con scrollbar oculta y flechas
// (el número de ligas crece). Clic en la activa la quita.
export function LigasRail({ ligas, active, onSelect, extra }: LigasRailProps) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const [edge, setEdge] = useState({ start: true, end: true })

  const update = useCallback(() => {
    const el = ref.current
    if (!el) return
    setEdge({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 })
  }, [])

  useEffect(() => {
    update()
    const el = ref.current
    if (!el) return
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => { el.removeEventListener('scroll', update); window.removeEventListener('resize', update) }
  }, [update, ligas.length])

  const scroll = (dir: -1 | 1) => ref.current?.scrollBy({ left: dir * SCROLL_STEP, behavior: 'smooth' })

  return (
    <div>
      <div className="ligas-rail-head">
        <h3 className="section-title">{t('deportes.leagues')}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="meta-label num">{t('deportes.leaguesOpen', { count: ligas.length })}</span>
          <div className="ligas-rail-arrows">
            <button type="button" className="carousel-nav-btn" onClick={() => scroll(-1)} disabled={edge.start} aria-label={t('deportes.prevLeagues')}>
              <Icon name="chevron-left" size={16} strokeWidth={2} />
            </button>
            <button type="button" className="carousel-nav-btn" onClick={() => scroll(1)} disabled={edge.end} aria-label={t('deportes.nextLeagues')}>
              <Icon name="chevron-right" size={16} strokeWidth={2} />
            </button>
          </div>
          {extra}
        </div>
      </div>
      <div ref={ref} className="ligas-rail tabs-scroll">
        {ligas.map(l => (
          <button
            key={l.sub}
            type="button"
            className={`liga-card${active === l.sub ? ' active' : ''}`}
            aria-pressed={active === l.sub}
            onClick={() => onSelect(active === l.sub ? null : l.sub)}
          >
            <LeagueMark sub={l.sub} />
            <span className="liga-card-name">{l.sub}</span>
            <span className="liga-card-meta meta-label num">{t('deportes.leagueMeta', { count: l.abiertos, volume: formatVolume(l.volumen) })}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
