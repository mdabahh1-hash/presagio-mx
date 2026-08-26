import type { Category } from '../types'

// Fuente única de categorías visibles (antes había copias divergentes en
// Markets/Home/Footer). El string es el identificador de API — no se traduce.
export const CATEGORIES: Category[] = [
  'Deportes', 'Política', 'Economía', 'Crypto', 'Tech', 'Global',
  'Mercados Globales', 'México', 'Clima', 'Entretenimiento',
]

// Subcategorías por categoría, en orden de display (México primero en Deportes).
// El string es exactamente el valor guardado en markets.subcategory; solo se
// listan las que tienen mercados hoy — agregar aquí al sembrar mercados nuevos.
export const SUBCATEGORIES: Partial<Record<Category, string[]>> = {
  'Deportes': [
    'Liga MX', 'Leagues Cup', 'Premier League', 'LaLiga', 'Serie A',
    'Bundesliga', 'Ligue 1', 'Liga Portugal', 'MLS', 'F1', 'Boxeo',
  ],
  'Política': ['Elecciones'],
}

// Deporte → ligas (rail "Todos los deportes" en CategoryBrowse). Solo Deportes
// tiene dos niveles. Al agregar una liga nueva a SUBCATEGORIES.Deportes hay que
// agregarla también a su deporte aquí; si no está en ningún grupo, el rail la
// muestra como deporte propio (fallback, no rompe). Identificadores: no se traducen.
export const SPORT_GROUPS: Record<string, string[]> = {
  'Fútbol': ['Liga MX', 'Leagues Cup', 'Premier League', 'LaLiga', 'Serie A', 'Bundesliga', 'Ligue 1', 'Liga Portugal', 'MLS'],
  'F1': ['F1'],
  'Boxeo': ['Boxeo'],
}

export function sportOfSub(sub: string): string | undefined {
  for (const [sport, leagues] of Object.entries(SPORT_GROUPS)) {
    if (leagues.includes(sub)) return sport
  }
  return undefined
}
