import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface TradeSheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

// Bottom sheet de operar en móvil (detalle de mercado e inicio): bloquea el
// scroll del body y cierra con Escape o tocando fuera.
export function TradeSheet({ open, onClose, children }: TradeSheetProps) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet-panel" role="dialog" aria-modal="true" aria-label={t('bet.title')} onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        {children}
      </div>
    </div>
  )
}
