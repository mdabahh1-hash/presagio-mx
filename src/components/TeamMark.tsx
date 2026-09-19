import React, { useMemo, useState } from 'react'
import { outcomeLogo } from '../lib/teamLogos'
import { isPersonSrc } from '../lib/peoplePhotos'

// Escudo (o cara, recortada en círculo) pequeño junto a un resultado (fila,
// tarjeta, detalle, BetBox…). Si no hay imagen mapeada o el archivo falla, no
// pinta nada (sin placeholder).
interface Props {
  label?: string
  outcomeKey?: string
  sub?: string | null
  marketId?: string | null
  size?: number
  style?: React.CSSProperties
}

export function TeamMark({ label = '', outcomeKey = '', sub, marketId, size = 20, style }: Props) {
  const src = useMemo(() => outcomeLogo({ outcome_key: outcomeKey, label }, sub, marketId), [label, outcomeKey, sub, marketId])
  const [failed, setFailed] = useState(false)
  if (!src || failed) return null
  return (
    <img
      className={`team-mark${isPersonSrc(src) ? ' team-mark--person' : ''}`}
      src={src}
      width={size}
      height={size}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      style={style}
    />
  )
}

// Marca neutral del Empate en un 1X2 (mismo tamaño que el escudo): el empate no
// tiene imagen y un número de posición ahí se leería como notación 1X2.
export function DrawMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden style={{ flexShrink: 0, display: 'block' }}>
      <circle cx="10" cy="10" r="9" fill="var(--bg-elevated)" stroke="var(--border-default)" />
      <path d="M6.5 8h7M6.5 12h7" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
