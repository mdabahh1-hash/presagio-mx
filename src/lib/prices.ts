// Display rounding for the SÍ/NO price pair.
//
// The NO label is DERIVED from the rounded YES label, never rounded
// independently — otherwise 23.5% renders as SÍ 24% + NO 77% = 101%
// (Math.round rounds both halves up). By construction yes + no === 100.
export function displayPair(yesPrice: number): { yes: number; no: number } {
  const yes = Math.round(yesPrice)
  return { yes, no: 100 - yes }
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
