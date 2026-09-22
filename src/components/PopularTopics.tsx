import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Category, Market } from '../types'
import { SUBCATEGORIES } from '../lib/categories'
import { Icon } from './Icon'

// "Explora por tema" (antes "Temas populares"), como los hot topics de Polymarket:
// cada renglón es una subcategoría, no un mercado (Mark, 2026-09-22). Usa los
// mercados que la Home ya cargó, sin otra petición.
// 6 filas llenan exactos los 420px que comparte con el hero en desktop; 7 no caben.
const TOP_N = 6
const MAX_POR_CATEGORIA = 2
const MIN_ABIERTOS = 2

export interface Tema { category: Category; sub: string; abiertos: number; volumen: number }

// Solo abiertos (un pendiente ya no se puede operar) y solo subcategorías
// declaradas: la landing solo sabe filtrar esas. Orden: abiertos, luego volumen
// total, luego nombre. Máximo 2 temas por categoría.
export function temasPopulares(markets: Market[]): Tema[] {
  const grupos = new Map<string, Tema>()
  for (const m of markets) {
    if (m.status !== 'open' || !m.subcategory || !SUBCATEGORIES[m.category]?.includes(m.subcategory)) continue
    const key = `${m.category}\u0000${m.subcategory}`
    const g = grupos.get(key) ?? { category: m.category, sub: m.subcategory, abiertos: 0, volumen: 0 }
    g.abiertos += 1
    g.volumen += m.volume
    grupos.set(key, g)
  }
  const porCategoria = new Map<Category, number>()
  return [...grupos.values()]
    .filter(g => g.abiertos >= MIN_ABIERTOS)
    .sort((a, b) => b.abiertos - a.abiertos || b.volumen - a.volumen || a.sub.localeCompare(b.sub, 'es'))
    .filter(g => {
      const n = porCategoria.get(g.category) ?? 0
      porCategoria.set(g.category, n + 1)
      return n < MAX_POR_CATEGORIA
    })
    .slice(0, TOP_N)
}

export function PopularTopics({ markets }: { markets: Market[] }) {
  const { t } = useTranslation()
  const temas = temasPopulares(markets)
  if (temas.length === 0) return null

  return (
    <div className="card popular-card" style={{ padding: '16px 16px 8px' }}>
      <h3 className="section-title" style={{ fontSize: 16, marginBottom: 6 }}>{t('popular.title')}</h3>
      <div className="popular-list" style={{ display: 'flex', flexDirection: 'column' }}>
        {temas.map((tema, i) => (
          <Link
            key={`${tema.category}/${tema.sub}`}
            to={`/mercados?cat=${encodeURIComponent(tema.category)}&sub=${encodeURIComponent(tema.sub)}`}
            className="list-row is-link popular-row"
            style={{ padding: '10px 4px', gap: 10 }}
          >
            <span className="num" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', width: 14, flexShrink: 0, textAlign: 'center' }}>
              {i + 1}
            </span>
            <span className="popular-topic-name" style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {tema.sub}
            </span>
            <span className="meta-label num" style={{ flexShrink: 0 }}>
              {t('popular.markets', { count: tema.abiertos })}
            </span>
            <Icon name="chevron-right" size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          </Link>
        ))}
      </div>
    </div>
  )
}
