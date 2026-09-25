import type { Category, Market } from '../types'
import type { IconName } from '../components/Icon'
import { SPORT_GROUPS } from './categories'

// Imagen cuadrada por mercado. Prioridad:
//   1. market.imageUrl (backend: https:// absoluta o ruta /img/... del frontend)
//   2. foto por id de mercado (MARKET_IMAGE)   — estático, sin backend
//   3. imagen de la subcategoría (liga)        — estático, sin backend
//   4. imagen de la categoría                  — estático, sin backend
//   5. null → MarketThumb pinta un tile con icono
// Los assets viven en public/img/markets/ (marcas propias, no logos oficiales).

function temaFoto(slug: string): string {
  return `/img/markets/temas/${slug}.jpg`
}

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
  'Champions League': '/img/markets/sub/champions-league.svg',
  'Saudi Pro League': '/img/markets/sub/saudi-pro-league.svg',
  'NFL': '/img/markets/sub/nfl.svg',
  'College Football': temaFoto('cfp'), // sin logo de liga en ESPN
  'F1': '/img/markets/sub/f1.svg',
  'Boxeo': '/img/markets/sub/boxeo.svg',
  'Fecha FIFA': '/img/markets/cat/deportes.svg', // sin logo propio: los partidos pintan banderas
  'Elecciones': '/img/markets/sub/elecciones.svg',
  // Fotos de Wikimedia Commons por tema (scripts/fetch-tema-photos.mjs, créditos en
  // public/img/markets/temas/CREDITS.md). Espejo en el backend: SUBCATEGORIAS_CON_IMAGEN
  // (seeds/plantillas.py); el agente revisor avisa de los temas que caen al ícono genérico.
  'Tasas Banxico': temaFoto('banxico'),
  'Inflación (INPC)': temaFoto('pesos'),
  'Tipo de cambio': temaFoto('pesos'),
  'PIB México': temaFoto('inegi'),
  'Aranceles / T-MEC': temaFoto('contenedores'),
  'Fed / tasas EE.UU.': temaFoto('fed'),
  'Bolsa (BMV)': temaFoto('bmv'),
  'Empleo / IMSS': temaFoto('imss'),
  'Mercados EEUU': temaFoto('nyse'),
  'Remesas': temaFoto('dolares'),
  'Bitcoin': temaFoto('bitcoin'),
  'Ethereum': temaFoto('ethereum'),
  'Solana': temaFoto('solana'),
  'Stablecoins': temaFoto('usdt'),
  'Mercado cripto': temaFoto('cripto'),
  'Regulación': temaFoto('sec'),
  'Sheinbaum': temaFoto('sheinbaum'),
  'Visas de EEUU': temaFoto('visa'),
  'Congreso': temaFoto('san-lazaro'),
  'Regulación digital': temaFoto('apps'),
  'Europa': temaFoto('europa'),
  'Elecciones EEUU': temaFoto('capitolio'),
  'Trump': temaFoto('trump'),
  'Medio Oriente': temaFoto('jerusalen'),
  'Asia-Pacífico': temaFoto('taipei'),
  'Américas': temaFoto('americas'),
  'Rusia-Ucrania': temaFoto('ucrania'),
  'África': temaFoto('africa'),
  'ONU y OTAN': temaFoto('onu'),
  'Migración': temaFoto('frontera'),
  'IA': temaFoto('ia'),
  'Videojuegos': temaFoto('control'),
  'Influencers': temaFoto('celular'),
  'Reality shows': temaFoto('estudio-tv'),
  'Música': temaFoto('concierto'),
  'Cine y series': temaFoto('claqueta'),
  'Farándula': temaFoto('alfombra'),
  'CDMX': temaFoto('angel'),
  'Cultura': temaFoto('basilica'),
  'Estados': temaFoto('estados'),
  'Batallas de aura': temaFoto('batalla'),
  'Seguridad': temaFoto('guardia'),
  'Huracanes': temaFoto('huracan'),
  'Sequía y calor': temaFoto('sequia'),
}

// Mercados ya sembrados sin subcategoría (Economía, 2026-09-18): foto por id. Al darles
// subcategoría, la de SUBCATEGORY_IMAGE los cubre y la entrada sobra.
export const MARKET_IMAGE: Record<string, string> = {
  'banxico-mantiene-tasa-sep26': temaFoto('banxico'),
  'banxico-recorte-tasa-2026-q3': temaFoto('banxico'),
  'mexico-inflacion-2026': temaFoto('pesos'),
  'tmec-extension-16-anos-2026': temaFoto('contenedores'),
}

/** Fotos locales de temas con variante @2x: srcSet para pantallas densas. */
export function marketImageSrcSet(src: string): string | undefined {
  const m = /^(\/img\/markets\/temas\/[\w-]+)\.jpg$/.exec(src)
  return m ? `${src} 1x, ${m[1]}@2x.jpg 2x` : undefined
}

// Logos OFICIALES de liga (scripts/fetch-league-logos.mjs, CDN de ESPN), dos variantes
// por tema: <liga>.png para fondo oscuro y <liga>-claro.png a color. Boxeo no es liga
// (sin logo) y Elecciones no es deporte: caen al tile .svg de SUBCATEGORY_IMAGE.
const LEAGUE_LOGO: Record<string, string> = {
  'Liga MX': 'liga-mx', 'Premier League': 'premier-league', 'LaLiga': 'laliga',
  'Serie A': 'serie-a', 'Bundesliga': 'bundesliga', 'Ligue 1': 'ligue-1',
  'Liga Portugal': 'liga-portugal', 'MLS': 'mls', 'Champions League': 'champions-league',
  'Leagues Cup': 'leagues-cup', 'Saudi Pro League': 'saudi-pro-league',
  'NFL': 'nfl', 'F1': 'f1',
}

export function hasLeagueLogo(sub?: string | null): boolean {
  return !!sub && sub in LEAGUE_LOGO
}

export function leagueLogo(sub?: string | null, theme: 'dark' | 'light' = 'dark'): string | null {
  const slug = sub ? LEAGUE_LOGO[sub] : null
  if (!slug) return sub ? SUBCATEGORY_IMAGE[sub] ?? null : null
  return `/img/markets/sub/${slug}${theme === 'light' ? '-claro' : ''}.png`
}

export const CATEGORY_IMAGE: Partial<Record<string, string>> = {
  'Deportes': '/img/markets/cat/deportes.svg',
  'Política': '/img/markets/cat/politica.svg',
  'Economía': '/img/markets/cat/economia.svg',
  'Crypto': '/img/markets/cat/crypto.svg',
  'Tech': '/img/markets/cat/tech.svg',
  'Global': '/img/markets/cat/global.svg',
  'México': '/img/markets/cat/mexico.svg',
  'Clima': '/img/markets/cat/clima.svg',
  'Entretenimiento': '/img/markets/cat/entretenimiento.svg',
  'Mundial 2026': '/img/markets/cat/deportes.svg',
  'Mercados Globales': '/img/markets/cat/economia.svg', // legado, ver categoryColors
}

// Fuente única: SPORT_GROUPS (antes había una copia literal que se desfasaba).
const FOOTBALL_LEAGUES = new Set(SPORT_GROUPS['Fútbol'] ?? [])

export function subcategoryIcon(sub?: string | null, cat?: Category | string): IconName {
  if (sub) {
    if (FOOTBALL_LEAGUES.has(sub)) return 'ball'
    if (sub === 'NFL' || sub === 'College Football') return 'football'
    if (sub === 'F1') return 'car'
    if (sub === 'Boxeo') return 'gloves'
    if (sub === 'Elecciones') return 'vote'
  }
  switch (cat) {
    case 'Deportes': case 'Mundial 2026': return 'ball'
    case 'Política': return 'vote'
    case 'Economía': case 'Mercados Globales': return 'bank'
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

export function marketImageSrc(m: Pick<Market, 'imageUrl' | 'subcategory' | 'category'> & Partial<Pick<Market, 'id'>>): string | null {
  return resolveMarketImage(m.imageUrl)
    ?? (m.id ? MARKET_IMAGE[m.id] ?? null : null)
    ?? (m.subcategory ? SUBCATEGORY_IMAGE[m.subcategory] ?? null : null)
    ?? CATEGORY_IMAGE[m.category]
    ?? null
}
