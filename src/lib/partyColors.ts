// Colores de partido para la barra de escaños y la tabla de partidos de la
// landing de Política. Son datos de codificación, no tokens de UI: viven aquí
// (misma forma que categoryColors.ts) y no entran a la paleta de index.css.
// Desaturados al nivel de los tokens --cat-* para no romper el look neutro.
// La clave es `partidos[].clave` del contenido curado (contenido_categorias/politica.py).

const PARTY_HEX: Record<string, string> = {
  'Morena': '#8C2E3E',
  'PAN': '#2F5EA8',
  'PVEM': '#3F8F52',
  'PT': '#B0445A',
  'PRI': '#4E7C59',
  'MC': '#C06A2A',
}

export function getPartyColor(party: string): string {
  return PARTY_HEX[party] ?? 'var(--bg-elevated)'
}

// Texto encima del color del partido (etiqueta del segmento, siglas de la ficha)
export function getPartyTextColor(party: string): string {
  return party in PARTY_HEX ? '#FFFFFF' : 'var(--text-primary)'
}
