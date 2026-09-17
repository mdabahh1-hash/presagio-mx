import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Icon } from '../Icon'
import type { Market } from '../../types'
import { SPORT_GROUPS, KINDS, kindLabelKey, type Kind } from '../../lib/categories'
import { useMobile } from '../../lib/useMobile'

interface FiltrosPopoverProps {
  markets: Market[]   // mercados de Deportes cargados (para los conteos)
  sport: string | null
  sub: string | null
  kind: Kind | null
  onSport: (sport: string | null) => void
  onSub: (sub: string | null) => void
  onKind: (kind: Kind | null) => void
}

function Item({ active, label, count, onClick, nested = 0 }: { active: boolean; label: string; count: number; onClick: () => void; nested?: 0 | 1 | 2 }) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      onClick={onClick}
      className={`cat-rail-item${nested === 1 ? ' cat-rail-sub' : nested === 2 ? ' cat-rail-sub2' : ''}`}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%',
        textAlign: 'left', cursor: 'pointer', padding: '8px 10px', borderRadius: 8, border: 'none',
        background: active ? 'var(--bg-elevated)' : 'transparent', color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontWeight: active ? 600 : 500, fontSize: 14, fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'background 0.15s, color 0.15s',
      }}
    >
      <span>{label}</span>
      <span className="num" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)' }}>{count}</span>
    </button>
  )
}

// "Filtros": el rail deporte → liga → tipo de CategoryBrowse, en un popover
// (desktop, .dropdown-panel) o en un sheet (móvil). Misma semántica que la URL
// (?sport= ?sub= ?kind=); CategoryBrowse no se toca.
export function FiltrosPopover({ markets, sport, sub, kind, onSport, onSub, onKind }: FiltrosPopoverProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isMobile = useMobile()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!isMobile && ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open, isMobile])

  const subCounts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const m of markets) if (m.subcategory) c[m.subcategory] = (c[m.subcategory] ?? 0) + 1
    return c
  }, [markets])

  // Deporte → ligas con mercados; una liga fuera de SPORT_GROUPS es su propio deporte
  const tree = useMemo(() => {
    const out: { sport: string; leagues: string[]; count: number }[] = []
    const grouped = new Set<string>()
    for (const [s, leagues] of Object.entries(SPORT_GROUPS)) {
      leagues.forEach(l => grouped.add(l))
      const vis = leagues.filter(l => (subCounts[l] ?? 0) > 0)
      if (vis.length) out.push({ sport: s, leagues: vis, count: vis.reduce((n, l) => n + (subCounts[l] ?? 0), 0) })
    }
    for (const s of Object.keys(subCounts)) if (!grouped.has(s)) out.push({ sport: s, leagues: [s], count: subCounts[s] })
    return out
  }, [subCounts])

  // Tipo (Partidos / Accesorios) solo bajo una liga o un deporte de liga única, y solo si hay de los dos
  const scope = sub ? markets.filter(m => m.subcategory === sub)
    : sport && (SPORT_GROUPS[sport] ?? [sport]).length === 1 ? markets.filter(m => m.subcategory && (SPORT_GROUPS[sport] ?? [sport]).includes(m.subcategory))
    : null
  const kindCounts = { partido: 0, accesorio: 0 } as Record<Kind, number>
  if (scope) for (const m of scope) if (m.kind) kindCounts[m.kind]++
  const kindVisible = !!scope && kindCounts.partido > 0 && kindCounts.accesorio > 0

  const items = (
    <>
      <div className="meta-label" style={{ padding: '8px 10px 4px' }}>{t('categoryBrowse.allSports')}</div>
      <Item active={!sport && !sub} label={t('categoryBrowse.subcatAll')} count={markets.length} onClick={() => { onSport(null); setOpen(false) }} />
      {tree.map(node => (
        <React.Fragment key={node.sport}>
          <Item active={sport === node.sport && !sub} label={node.sport} count={node.count} onClick={() => { onSport(sport === node.sport ? null : node.sport); if (!isMobile) setOpen(false) }} />
          {sport === node.sport && node.leagues.length > 1 && node.leagues.map(l => (
            <Item key={l} nested={1} active={sub === l} label={l} count={subCounts[l] ?? 0} onClick={() => { onSub(sub === l ? null : l); if (!isMobile) setOpen(false) }} />
          ))}
        </React.Fragment>
      ))}
      {kindVisible && (
        <>
          <div className="meta-label" style={{ padding: '10px 10px 4px', borderTop: '1px solid var(--border-subtle)', marginTop: 6 }}>{t('deportes.kind')}</div>
          {KINDS.map(k => (
            <Item key={k} active={kind === k} label={t(kindLabelKey(k))} count={kindCounts[k]} onClick={() => { onKind(kind === k ? null : k); setOpen(false) }} />
          ))}
        </>
      )}
    </>
  )

  const activeLabel = [sport && sport !== sub ? sport : null, sub, kind ? t(kindLabelKey(kind)) : null].filter(Boolean).join(' · ')

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button type="button" className="btn btn-secondary" onClick={() => setOpen(v => !v)} aria-haspopup="menu" aria-expanded={open} style={{ fontSize: 13, color: activeLabel ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
        <Icon name="sliders" size={14} />
        {activeLabel || t('deportes.filters')}
        <Icon name="chevron-down" size={14} style={{ color: 'var(--text-tertiary)', transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }} />
      </button>
      {open && (isMobile ? createPortal(
        <div className="sheet-overlay" onClick={() => setOpen(false)}>
          <div className="sheet-panel" role="menu" aria-label={t('deportes.filtersTitle')} onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            {items}
          </div>
        </div>,
        document.body,
      ) : (
        <div
          role="menu"
          aria-label={t('deportes.filtersTitle')}
          className="dropdown-panel"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200, minWidth: 240,
            background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 12, padding: 6, boxShadow: 'var(--shadow-pop)',
          }}
        >
          {items}
        </div>
      ))}
    </div>
  )
}
