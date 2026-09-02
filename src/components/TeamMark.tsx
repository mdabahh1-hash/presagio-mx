import React, { useMemo, useState } from 'react'
import { outcomeLogo } from '../lib/teamLogos'

// Escudo pequeño junto a un resultado (fila, tarjeta, detalle, BetBox…).
// Si no hay logo mapeado o el archivo falla, no pinta nada (sin placeholder).
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
      className="team-mark"
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
