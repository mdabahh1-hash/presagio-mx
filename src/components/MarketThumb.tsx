import React, { useState } from 'react'
import type { Category, Market } from '../types'
import { marketImageSrc, subcategoryIcon } from '../lib/marketImage'
import { getCategoryColor } from '../lib/categoryColors'
import { Icon } from './Icon'

// Thumbnail cuadrado del mercado (filas, tarjetas, hero, búsqueda). Si la
// imagen falla o no hay, tile neutro con el icono de la liga/categoría.
interface Props {
  market: Pick<Market, 'imageUrl' | 'subcategory' | 'category'>
  size?: number
  radius?: number
  style?: React.CSSProperties
  className?: string
}

export function MarketThumb({ market, size = 40, radius, style, className = '' }: Props) {
  const [failed, setFailed] = useState(false)
  const src = failed ? null : marketImageSrc(market)
  return (
    <div className={`thumb ${className}`} style={{ width: size, height: size, borderRadius: radius, ...style }} aria-hidden="true">
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
