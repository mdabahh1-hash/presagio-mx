import type { Category } from '../types'

// Fuente única de categorías visibles (antes había copias divergentes en
// Markets/Home/Footer). El string es el identificador de API — no se traduce.
export const CATEGORIES: Category[] = [
  'Deportes', 'Política', 'Economía', 'Crypto', 'Tech', 'Global',
  'México', 'Clima', 'Entretenimiento',
]

// Subcategorías por categoría, en orden de display (México primero en Deportes).
// El string es exactamente el valor guardado en markets.subcategory. Los rails
// (CategoryBrowse y las landings) ocultan las que tienen 0 mercados, así que una
// subcategoría puede listarse antes de sembrarla (Economía, 2026-09-18).

export const SUBCATEGORIES: Partial<Record<Category, string[]>> = {
  'Deportes': [
    'Liga MX', 'Leagues Cup', 'Premier League', 'LaLiga', 'Serie A',
    'Bundesliga', 'Ligue 1', 'Liga Portugal', 'MLS', 'Champions League',
    'Saudi Pro League', 'Fecha FIFA', 'NFL', 'College Football', 'F1', 'Boxeo',
  ],
  'Política': ['Elecciones', 'Sheinbaum', 'Visas de EEUU', 'Congreso', 'Regulación digital'],
  'Economía': [
    'Tasas Banxico', 'Inflación (INPC)', 'Tipo de cambio', 'PIB México',
    'Empleo / IMSS', 'Aranceles / T-MEC', 'Fed / tasas EE.UU.', 'Bolsa (BMV)',
    'Mercados EEUU', 'Remesas',
  ],
  'Crypto': ['Bitcoin', 'Ethereum', 'Solana', 'Stablecoins', 'Regulación', 'Adopción México', 'Mercado cripto'],
  'Entretenimiento': ['Influencers', 'Reality shows', 'Música', 'Cine y series', 'Farándula'],
  'Global': [
    'Europa', 'Elecciones EEUU', 'Trump', 'Medio Oriente', 'Asia-Pacífico',
    'Rusia-Ucrania', 'Américas', 'África', 'ONU y OTAN', 'Migración',
  ],
  'Tech': ['IA', 'Videojuegos', 'Apps y redes'],
  'México': ['CDMX', 'Cultura', 'Estados', 'Mascotas y virales', 'Batallas de aura', 'Seguridad'],
  'Clima': ['Huracanes', 'Sequía y calor'],
}

// Deporte → ligas (rail "Todos los deportes" en CategoryBrowse). Solo Deportes
// tiene dos niveles. Al agregar una liga nueva a SUBCATEGORIES.Deportes hay que
// agregarla también a su deporte aquí; si no está en ningún grupo, el rail la
// muestra como deporte propio (fallback, no rompe). Identificadores: no se traducen.
export const SPORT_GROUPS: Record<string, string[]> = {
  'Fútbol': ['Liga MX', 'Leagues Cup', 'Premier League', 'LaLiga', 'Serie A', 'Bundesliga', 'Ligue 1', 'Liga Portugal', 'MLS', 'Champions League', 'Saudi Pro League', 'Fecha FIFA'],
  'NFL': ['NFL'],
  'College Football': ['College Football'],
  'F1': ['F1'],
  'Boxeo': ['Boxeo'],
}

export function sportOfSub(sub: string): string | undefined {
  for (const [sport, leagues] of Object.entries(SPORT_GROUPS)) {
    if (leagues.includes(sub)) return sport
  }
  return undefined
}

// Tercer nivel del rail de Deportes: bajo una liga (o bajo un deporte de liga
// única como NFL) los mercados se parten en Partidos / Accesorios. El valor es
// exactamente markets.kind del backend; la etiqueta se traduce.
export const KINDS = ['partido', 'accesorio'] as const
export type Kind = typeof KINDS[number]

// Literal (no string): las claves de i18n están tipadas contra es.json.
export function kindLabelKey(kind: Kind) {
  return kind === 'partido' ? ('categoryBrowse.kindPartido' as const) : ('categoryBrowse.kindAccesorio' as const)
}

export function isKind(value: string | null | undefined): value is Kind {
  return value === 'partido' || value === 'accesorio'
}

// Categorías con landing propia (components/deportes|politica|crypto). Cualquier
// otra categoría de CATEGORIES usa CategoryLanding (components/categoria), que es
// el diseño por defecto: una categoría nueva lo hereda sin tocar las páginas.
export const LANDINGS_PROPIAS: readonly Category[] = ['Deportes', 'Política', 'Crypto']

// Acepta string porque llega del querystring (?cat=) o de la pestaña de la Home:
// un valor que no esté en CATEGORIES no monta ninguna landing.
export function usaLandingGenerica(cat: string): cat is Category {
  return (CATEGORIES as readonly string[]).includes(cat) && !(LANDINGS_PROPIAS as readonly string[]).includes(cat)
}

// Desde 2026-09-24 las tres propias también abren con el grid de CategoryLanding; su
// landing con gráficas queda detrás de la tarjeta panel (PanelCard), la primera celda.
export function tienePanel(cat: string): cat is Category {
  return (LANDINGS_PROPIAS as readonly string[]).includes(cat)
}
