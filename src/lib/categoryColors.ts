// Colores por categoría, resueltos vía CSS custom properties para que
// cambien con el tema (tokens --cat-* en index.css). La categoría es un
// identificador de API/URL — nunca se traduce ni se transforma; aquí solo
// se mapea a su color de display.

const CATEGORY_TOKEN: Record<string, string> = {
  'Política': 'gold',
  'Economía': 'gold',
  'México': 'gold',
  'Deportes': 'green',
  'Mundial 2026': 'green', // legado: mercados ya resueltos siguen usándola
  'Global': 'blue',
  'Mercados Globales': 'blue',
  'Tech': 'purple',
  'Entretenimiento': 'pink',
  'Crypto': 'orange',
  'Clima': 'sky',
}

export function getCategoryColor(category: string): string {
  return `var(--cat-${CATEGORY_TOKEN[category] ?? 'default'})`
}

export function getCategoryBg(category: string): string {
  return `var(--cat-${CATEGORY_TOKEN[category] ?? 'default'}-bg)`
}

export function getCategoryBorder(category: string): string {
  return `var(--cat-${CATEGORY_TOKEN[category] ?? 'default'}-border)`
}
