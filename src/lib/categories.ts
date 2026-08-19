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
