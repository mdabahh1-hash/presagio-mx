// returnTo: a dónde volver después de un login. Lo usa la landing de invitación
// de ligas (`/l/:code?join=1` → auto-join al volver). sessionStorage sobrevive
// el round-trip del OAuth (backend → /auth/callback) en la misma pestaña.

const KEY = 'veredikt_return_to'

/** Guarda una ruta hash (sin '#'), p. ej. "/l/abc123?join=1". */
export function setReturnTo(route: string) {
  try {
    sessionStorage.setItem(KEY, route)
  } catch {
    /* ignore */
  }
}

/** Devuelve la ruta pendiente y la borra (un solo uso). */
export function consumeReturnTo(): string | null {
  try {
    const v = sessionStorage.getItem(KEY)
    if (v) sessionStorage.removeItem(KEY)
    return v
  } catch {
    return null
  }
}
