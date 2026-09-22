// Orden de las opciones de un multi donde se lista el set completo (tarjeta,
// MarketRow, detalle, embed). Un 1X2 va fijo local → empate → visitante: son las
// keys que escribe siempre el atajo `partido` del sembrador (la API devuelve por
// precio y no expone el orden de creación). Cualquier otro multi, por probabilidad.
const ORDEN_1X2 = ['local', 'empate', 'visitante']

export const is1x2 = (outcomes: { outcome_key: string }[]) =>
  outcomes.length === 3 && ORDEN_1X2.every(k => outcomes.some(o => o.outcome_key === k))

export function orderOutcomes<T extends { outcome_key: string; price: number }>(outcomes: T[]): T[] {
  return [...outcomes].sort(is1x2(outcomes)
    ? (a, b) => ORDEN_1X2.indexOf(a.outcome_key) - ORDEN_1X2.indexOf(b.outcome_key)
    : (a, b) => b.price - a.price)
}

/**
 * Los dos equipos de un mercado de partido en orden local → visitante (más el
 * empate si es un 1X2). Un 1X2 va por outcome_key; un partido de dos equipos, por
 * la posición de cada key en el id (`nfl-{local}-{visitante}-…`, la convención que
 * escribe el sembrador y que ya usa `matchLogos`). Si no se puede afirmar quién es
 * el local devuelve null y la tarjeta cae al layout multi de siempre: nunca se
 * inventa una localía.
 */
export function matchOutcomes<T extends { outcome_key: string }>(
  m: { id: string; kind?: string | null; outcomes?: T[] },
): { local: T; empate?: T; visitante: T } | null {
  const outcomes = m.outcomes ?? []
  if (m.kind !== 'partido') return null
  if (is1x2(outcomes)) {
    const by = (k: string) => outcomes.find(o => o.outcome_key === k)!
    return { local: by('local'), empate: by('empate'), visitante: by('visitante') }
  }
  if (outcomes.length !== 2) return null
  const at = (o: T) => m.id.indexOf(o.outcome_key)
  const [local, visitante] = [...outcomes].sort((a, b) => at(a) - at(b))
  return at(local) >= 0 && at(visitante) > at(local) ? { local, visitante } : null
}
