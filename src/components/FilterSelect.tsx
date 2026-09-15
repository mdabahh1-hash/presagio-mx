import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon, type IconName } from './Icon'
import { useMobile } from '../lib/useMobile'

export interface FilterOption<V extends string> {
  value: V
  label: string
}

interface Props<V extends string> {
  // Texto de la píldora (normalmente la etiqueta de la opción elegida)
  label: string
  value: V
  options: FilterOption<V>[]
  onChange: (value: V) => void
  icon?: IconName
  // Distinto del valor por defecto: píldora resaltada
  active?: boolean
  // Título del sheet en móvil y aria-label del botón
  title: string
}

// Píldora desplegable de filtro (fila de filtros de la pestaña Nuevo, estilo
// Polymarket): botón `.pill` con chevron. En desktop abre un panel con el patrón
// de popover del repo (`.dropdown-panel`, bg-card, borde, radio 12, shadow-pop);
// en móvil abre un bottom sheet (la fila de filtros hace scroll horizontal y
// recortaría un panel absoluto). Neutro, sin oro.
export function FilterSelect<V extends string>({ label, value, options, onChange, icon, active, title }: Props<V>) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isMobile = useMobile()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!isMobile && ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open, isMobile])

  const pick = (v: V) => { onChange(v); setOpen(false) }

  const items = options.map(opt => {
    const selected = opt.value === value
    return (
      <button
        key={opt.value}
        type="button"
        role="menuitemradio"
        aria-checked={selected}
        onClick={() => pick(opt.value)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          width: '100%', padding: isMobile ? '13px 10px' : '9px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: 'transparent', textAlign: 'left', whiteSpace: 'nowrap',
          fontFamily: 'inherit', fontSize: isMobile ? 15 : 14, fontWeight: selected ? 600 : 500,
          color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        {opt.label}
        {selected && <Icon name="check" size={14} strokeWidth={2} />}
      </button>
    )
  })

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        className={`pill${active ? ' active' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={title}
      >
        {icon && <Icon name={icon} size={14} strokeWidth={2} />}
        {label}
        <Icon name="chevron-down" size={14} style={{ color: 'var(--text-tertiary)', transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : undefined }} />
      </button>
      {open && (isMobile ? createPortal(
        // Portal al body: la fila de filtros está animada (transform) y haría de
        // contenedor del overlay fijo, recortándolo con su scroll horizontal.
        <div className="sheet-overlay" onClick={() => setOpen(false)}>
          <div className="sheet-panel" role="menu" aria-label={title} onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <p className="meta-label" style={{ margin: '0 10px 6px' }}>{title}</p>
            {items}
          </div>
        </div>,
        document.body,
      ) : (
        <div
          role="menu"
          aria-label={title}
          className="dropdown-panel"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 200, minWidth: 200,
            transformOrigin: 'top left',
            background: 'var(--bg-card)', border: '1px solid var(--border-default)',
            borderRadius: 12, padding: 6, boxShadow: 'var(--shadow-pop)',
          }}
        >
          {items}
        </div>
      ))}
    </div>
  )
}
