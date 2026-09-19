import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface TradeSheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

// Duración de la salida: espejo de sheetOut / .sheet-overlay--out en index.css
export const SHEET_EXIT_MS = 180

// Bottom sheet de operar en móvil (detalle de mercado e inicio): bloquea el
// scroll del body y cierra con Escape o tocando fuera. Al cerrar sigue montado
// lo que dura la animación de salida, con el último contenido que tuvo (quien
// lo monta suele dejar de pasar children en cuanto cierra).
export function TradeSheet({ open, onClose, children }: TradeSheetProps) {
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

  if (!open && !mounted) return null
  return (
    <div className={`sheet-overlay${open ? '' : ' sheet-overlay--out'}`} onClick={open ? onClose : undefined} aria-hidden={!open || undefined}>
      <div className="sheet-panel" role="dialog" aria-modal="true" aria-label={t('bet.title')} onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        {open ? children : last.current}
      </div>
    </div>
  )
}
