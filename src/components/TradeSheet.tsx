import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface TradeSheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  // Cambia cuando el contenido pasa a otra pantalla (compra ↔ acceso): el panel
  // anima su altura de una a otra en vez de saltar
  contentKey?: string
}

// Duración de la salida: espejo de sheetOut / .sheet-overlay--out en index.css
export const SHEET_EXIT_MS = 180

// Bottom sheet de operar en móvil (detalle de mercado e inicio): bloquea el
// scroll del body y cierra con Escape o tocando fuera. Al cerrar sigue montado
// lo que dura la animación de salida, con el último contenido que tuvo (quien
// lo monta suele dejar de pasar children en cuanto cierra).
export function TradeSheet({ open, onClose, children, contentKey }: TradeSheetProps) {
  const { t } = useTranslation()
  const [mounted, setMounted] = useState(open)
  const last = useRef(children)
  if (open) last.current = children

  useEffect(() => {
    if (open) { setMounted(true); return }
    const id = window.setTimeout(() => setMounted(false), SHEET_EXIT_MS)
    return () => window.clearTimeout(id)
  }, [open])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
  }, [open, onClose])

  const panel = useRef<HTMLDivElement>(null)
  const prev = useRef<{ key?: string; h: number } | null>(null)
  useLayoutEffect(() => {
    const el = panel.current
    if (!el || !open) { prev.current = null; return }
    if (el.style.height) return // transición en curso: no medir a medias
    const h = el.getBoundingClientRect().height
    const from = prev.current
    prev.current = { key: contentKey, h }
    if (!from || from.key === contentKey || Math.abs(from.h - h) < 1) return
    el.style.height = `${from.h}px`
    el.getBoundingClientRect() // reflow: fija el punto de partida
    el.style.transition = 'height 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)'
    el.style.height = `${h}px`
    const done = () => { el.style.height = ''; el.style.transition = ''; window.clearTimeout(id); el.removeEventListener('transitionend', done) }
    const id = window.setTimeout(done, 320) // por si transitionend no llega
    el.addEventListener('transitionend', done)
  })

  if (!open && !mounted) return null
  return (
    <div className={`sheet-overlay${open ? '' : ' sheet-overlay--out'}`} onClick={open ? onClose : undefined} aria-hidden={!open || undefined}>
      <div ref={panel} className="sheet-panel" role="dialog" aria-modal="true" aria-label={t('bet.title')} onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        {open ? children : last.current}
      </div>
    </div>
  )
}
