// Referral-code capture. A friend's link looks like `https://veredikt.mx/?ref=CODE`.
// OAuth redirects the user away from the app, so we stash the code at first load
// and attach it once the user is authenticated (see AuthContext).

const KEY = 'veredikt_ref'

export function captureRefFromUrl(): void {
  try {
    const code = new URLSearchParams(window.location.search).get('ref')
    if (code) {
      localStorage.setItem(KEY, code.trim().toUpperCase())
      // Clean the query string so it doesn't linger / get re-shared.
      const url = new URL(window.location.href)
      url.searchParams.delete('ref')
      window.history.replaceState({}, '', url.pathname + url.search + url.hash)
    }
  } catch {
    /* ignore */
  }
}

export function getPendingRef(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function clearPendingRef(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
