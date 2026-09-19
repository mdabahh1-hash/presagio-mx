// returnTo: a dónde volver después de un login. Lo usa la landing de invitación
// de ligas (`/l/:code?join=1` → auto-join al volver) y la home de una liga.
//
// Dos caminos:
// - Email/passkey (sin salir de la pestaña): sessionStorage, `consumeReturnTo()`.
// - OAuth (Google/GitHub): la ruta viaja en el `state` firmado del backend como
//   `next` (`oauthNext()` al construir el link, `?next=` de vuelta en
//   /auth/callback). sessionStorage no cruza navegadores — el link de
//   invitación abierto en WhatsApp/Instagram salta a Safari y se perdía —, así
//   que queda solo como fallback.

const KEY = 'veredikt_return_to'
const MAX_LEN = 200
// Mismas reglas que `_safe_next` en el backend: caracteres URL imprimibles,
// sin '#', '\' ni espacios.
const ALLOWED = /^[A-Za-z0-9\-._~!$&'()*+,;=:@/?%]+$/

/** Guarda una ruta hash (sin '#'), p. ej. "/l/abc123?join=1". */
export function setReturnTo(route: string) {
  try {
    sessionStorage.setItem(KEY, route)
  } catch {
    /* ignore */
  }
}

/** Devuelve la ruta pendiente y la borra (un solo uso). Si no es una ruta interna segura, null. */
export function consumeReturnTo(): string | null {
  try {
    const v = sessionStorage.getItem(KEY)
    if (v) sessionStorage.removeItem(KEY)
    return isSafeRoute(v) ? v : null
  } catch {
    return null
  }
}

/** Lee la ruta pendiente sin borrarla (para armar el `next` del OAuth). */
export function peekReturnTo(): string | null {
  try {
    const v = sessionStorage.getItem(KEY)
    return isSafeRoute(v) ? v : null
  } catch {
    return null
  }
}

/** Ruta hash relativa y segura para `navigate()`: un solo '/', sin esquema, sin '#'. */
export function isSafeRoute(s: string | null | undefined): s is string {
  if (!s || s.length > MAX_LEN) return false
  if (!s.startsWith('/') || s.startsWith('//') || s.startsWith('/\\')) return false
  if (s.startsWith('/auth/callback')) return false
  return ALLOWED.test(s)
}

/** Ruta hash actual sin '#', p. ej. "/mercado/12". */
export function currentHashRoute(): string {
  return window.location.hash.slice(1) || '/'
}

/**
 * `next` para el arranque de OAuth: el returnTo pendiente (invitación, liga) o,
 * si no hay, la ruta actual para volver donde estaba el usuario. `undefined`
 * si es la portada o no es segura (el backend la validará de nuevo).
 */
export function oauthNext(): string | undefined {
  const candidate = peekReturnTo() ?? currentHashRoute()
  return isSafeRoute(candidate) && candidate !== '/' ? candidate : undefined
}
