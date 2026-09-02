import React, { useMemo, useState } from 'react'
import type { Category, Market } from '../types'
import { marketImageSrc, subcategoryIcon } from '../lib/marketImage'
import { matchLogos } from '../lib/teamLogos'
import { getCategoryColor } from '../lib/categoryColors'
import { Icon } from './Icon'

// Thumbnail cuadrado del mercado (filas, tarjetas, hero, búsqueda).
// Precedencia: imagen explícita del backend (que no sea el default de liga/
// categoría) → composite "A vs B" con los dos escudos si es un partido →
// imagen de liga/categoría → tile con icono.
type ThumbMarket = Pick<Market, 'imageUrl' | 'subcategory' | 'category'> & Partial<Pick<Market, 'id' | 'question' | 'outcomes'>>

interface Props {
  market: ThumbMarket
  size?: number
  radius?: number
  style?: React.CSSProperties
  className?: string
}

const isDefaultImage = (url?: string | null) =>
  !url || url.startsWith('/img/markets/sub/') || url.startsWith('/img/markets/cat/')

export function MarketThumb({ market, size = 40, radius, style, className = '' }: Props) {
  const [failed, setFailed] = useState(false)
  const [failedA, setFailedA] = useState(false)
  const [failedB, setFailedB] = useState(false)

  const pair = useMemo(
    () => (isDefaultImage(market.imageUrl) ? matchLogos(market) : null),
    [market.imageUrl, market.id, market.question, market.subcategory, market.outcomes],
  )

  const box: React.CSSProperties = { width: size, height: size, borderRadius: radius, ...style }

  if (pair && !(failedA && failedB)) {
    const solo = failedA || failedB
    return (
      <div className={`thumb thumb-vs${solo ? ' thumb-vs--solo' : ''} ${className}`} style={box} aria-hidden="true">
        {!failedA && <img src={pair[0]} alt="" loading="lazy" decoding="async" onError={() => setFailedA(true)} />}
        {!failedB && <img src={pair[1]} alt="" loading="lazy" decoding="async" onError={() => setFailedB(true)} />}
      </div>
    )
  }

  const src = failed ? null : marketImageSrc(market)
  return (
    <div className={`thumb ${className}`} style={box} aria-hidden="true">
      {src ? (
        <img src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        <Icon
          name={subcategoryIcon(market.subcategory, market.category as Category)}
          size={Math.round(size * 0.45)}
          strokeWidth={1.75}
          style={{ color: getCategoryColor(market.category) }}
        />
      )}
    </div>
  )
}
