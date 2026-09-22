// Display rounding for the SÍ/NO price pair.
//
// The NO label is DERIVED from the rounded YES label, never rounded
// independently — otherwise 23.5% renders as SÍ 24% + NO 77% = 101%
// (Math.round rounds both halves up). By construction yes + no === 100.
export function displayPair(yesPrice: number): { yes: number; no: number } {
  const yes = Math.round(yesPrice)
  return { yes, no: 100 - yes }
}

// Probabilidad para mostrar (0-100), con su unidad («%», o «¢» donde un multi
// cotiza en centavos). Mientras el mercado no resuelve nada es seguro: nunca «0%»
// ni «100%», sino «<1%» y «>99%» (con un decimal, «<0.1%» y «>99.9%»). Solo un
// mercado resuelto o cancelado enseña el número tal cual.
export function probText(p: number, status?: string | null, decimales = 0, unidad = '%'): string {
  const txt = p.toFixed(decimales)
  const min = 10 ** -decimales
  const terminado = !!status && (status.startsWith('resolved') || status === 'cancelled')
  if (!terminado && +txt < min) return `<${min}${unidad}`
  if (!terminado && +txt > 100 - min) return `>${(100 - min).toFixed(decimales)}${unidad}`
  return `${txt}${unidad}`
}

// «No» de una opción en un multi: side NO con la clave de la opción. Las filas
// binarias guardan outcome_key = lado ('YES'/'NO'), así que no entran aquí.
export function isOutcomeNo(side: string | null | undefined, outcomeKey: string | null | undefined): boolean {
  return side === 'NO' && !!outcomeKey && outcomeKey !== 'NO'
}

// Color de una probabilidad SÍ (0-100): verde si es alta, rojo si es baja, neutro
// en medio. Regla del design system (veredikt.md §7); antes vivía copiada inline.
export function probColor(yesPrice: number): string {
  return yesPrice >= 65 ? 'var(--green)' : yesPrice <= 35 ? 'var(--red)' : 'var(--text-primary)'
}
