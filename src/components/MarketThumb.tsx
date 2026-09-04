import React, { useMemo, useState } from 'react'
import type { Category, Market } from '../types'
import { marketImageSrc, subcategoryIcon } from '../lib/marketImage'
import { matchLogos } from '../lib/teamLogos'
import { marketFaces } from '../lib/peoplePhotos'
import { getCategoryColor } from '../lib/categoryColors'
import { Icon } from './Icon'

// Thumbnail cuadrado del mercado (filas, tarjetas, hero, búsqueda).
// Precedencia: imagen explícita del backend (que no sea el default de liga/
// categoría) → composite "A vs B" con los dos escudos si es un partido →
// caras de las personas de la pregunta (deportes) → imagen de liga/categoría →
// tile con icono.
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

  const composite = useMemo(() => {
    if (!isDefaultImage(market.imageUrl)) return null
    const pair = matchLogos(market)
    if (pair) return { srcs: pair, faces: false }
    const faces = marketFaces(market)
    if (faces?.kind === 'pair') return { srcs: faces.srcs, faces: true }
    if (faces?.kind === 'solo') return { srcs: [faces.src] as [string], faces: true }
    return null
  }, [market.imageUrl, market.id, market.question, market.subcategory, market.category, market.outcomes])

  const box: React.CSSProperties = { width: size, height: size, borderRadius: radius, ...style }

  if (composite && composite.srcs.length === 2 && !(failedA && failedB)) {
    const [a, b] = composite.srcs
    const solo = failedA || failedB
    const cls = `thumb thumb-vs${solo ? ' thumb-vs--solo' : ''}${composite.faces ? ' thumb-vs--faces' : ''} ${className}`
    return (
      <div className={cls} style={box} aria-hidden="true">
        {!failedA && <img src={a} alt="" loading="lazy" decoding="async" onError={() => setFailedA(true)} />}
        {!failedB && <img src={b} alt="" loading="lazy" decoding="async" onError={() => setFailedB(true)} />}
      </div>
    )
  }

  const face = composite && composite.srcs.length === 1 && !failedA ? composite.srcs[0] : null
  const src = face ?? (failed ? null : marketImageSrc(market))
  return (
    <div className={`thumb ${className}`} style={box} aria-hidden="true">
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => (face ? setFailedA(true) : setFailed(true))}
        />
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
