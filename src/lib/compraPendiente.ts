// Compra que el usuario ya pidió (tocó Comprar) y quedó esperando el acceso con
// Google/GitHub, que sale de la página. Al volver, el BetBox de ese mercado la
// ejecuta sola. La marca solo se pone al tocar el botón del proveedor, así que un
// link con ?side= de otra persona nunca dispara una compra.
const KEY = 'veredikt.compraPendiente'
const TTL_MS = 10 * 60_000

export function marcarCompraPendiente(route: string, now = Date.now()) {
  try { localStorage.setItem(KEY, JSON.stringify({ route, at: now })) } catch { /* sin storage: no hay auto-compra */ }
}

/** true (y la borra) si hay una compra pendiente vigente para ese mercado. */
export function tomarCompraPendiente(marketId: string, now = Date.now()): boolean {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return false
    const { route, at } = JSON.parse(raw) as { route?: string; at?: number }
    const vencida = typeof at !== 'number' || now - at > TTL_MS
    const coincide = typeof route === 'string' && route.startsWith(`/mercado/${encodeURIComponent(marketId)}?`)
    if (vencida || coincide) localStorage.removeItem(KEY)
    return coincide && !vencida
  } catch {
    return false
  }
}
