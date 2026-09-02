import type { Category, Market } from '../types'
import type { IconName } from '../components/Icon'

// Imagen cuadrada por mercado. Prioridad:
//   1. market.imageUrl (backend: https:// absoluta o ruta /img/... del frontend)
//   2. imagen de la subcategoría (liga)        — estático, sin backend
//   3. imagen de la categoría                  — estático, sin backend
//   4. null → MarketThumb pinta un tile con icono
// Los assets viven en public/img/markets/ (marcas propias, no logos oficiales).

export const SUBCATEGORY_IMAGE: Record<string, string> = {
  'Liga MX': '/img/markets/sub/liga-mx.svg',
  'Leagues Cup': '/img/markets/sub/leagues-cup.svg',
  'Premier League': '/img/markets/sub/premier-league.svg',
  'LaLiga': '/img/markets/sub/laliga.svg',
  'Serie A': '/img/markets/sub/serie-a.svg',
  'Bundesliga': '/img/markets/sub/bundesliga.svg',
  'Ligue 1': '/img/markets/sub/ligue-1.svg',
  'Liga Portugal': '/img/markets/sub/liga-portugal.svg',
  'MLS': '/img/markets/sub/mls.svg',
  'NFL': '/img/markets/sub/nfl.svg',
  'F1': '/img/markets/sub/f1.svg',
  'Boxeo': '/img/markets/sub/boxeo.svg',
  'Elecciones': '/img/markets/sub/elecciones.svg',
}

export const CATEGORY_IMAGE: Partial<Record<string, string>> = {
  'Deportes': '/img/markets/cat/deportes.svg',
  'Política': '/img/markets/cat/politica.svg',
  'Economía': '/img/markets/cat/economia.svg',
  'Crypto': '/img/markets/cat/crypto.svg',
  'Tech': '/img/markets/cat/tech.svg',
  'Global': '/img/markets/cat/global.svg',
  'Mercados Globales': '/img/markets/cat/mercados-globales.svg',
  'México': '/img/markets/cat/mexico.svg',
  'Clima': '/img/markets/cat/clima.svg',
  'Entretenimiento': '/img/markets/cat/entretenimiento.svg',
  'Mundial 2026': '/img/markets/cat/deportes.svg',
}

const FOOTBALL_LEAGUES = new Set(['Liga MX', 'Leagues Cup', 'Premier League', 'LaLiga', 'Serie A', 'Bundesliga', 'Ligue 1', 'Liga Portugal', 'MLS'])

export function subcategoryIcon(sub?: string | null, cat?: Category | string): IconName {
  if (sub) {
    if (FOOTBALL_LEAGUES.has(sub)) return 'ball'
    if (sub === 'NFL') return 'football'
    if (sub === 'F1') return 'car'
    if (sub === 'Boxeo') return 'gloves'
    if (sub === 'Elecciones') return 'vote'
  }
  switch (cat) {
    case 'Deportes': case 'Mundial 2026': return 'ball'
    case 'Política': return 'vote'
    case 'Economía': return 'bank'
    case 'Mercados Globales': return 'chart'
    case 'Crypto': return 'coin'
    case 'Tech': return 'cpu'
    case 'Entretenimiento': return 'film'
    case 'Clima': return 'cloud'
    case 'Global': return 'globe'
    case 'México': return 'flag'
    default: return 'trending'
  }
}

/** Solo https:// absoluto o ruta propia /img/... (nada de hotlink http ni data:). */
export function resolveMarketImage(url?: string | null): string | null {
  if (!url) return null
  if (url.startsWith('/img/')) return url
  if (/^https:\/\//i.test(url)) return url
  return null
}

export function marketImageSrc(m: Pick<Market, 'imageUrl' | 'subcategory' | 'category'>): string | null {
  return resolveMarketImage(m.imageUrl)
    ?? (m.subcategory ? SUBCATEGORY_IMAGE[m.subcategory] ?? null : null)
    ?? CATEGORY_IMAGE[m.category]
    ?? null
}
