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
