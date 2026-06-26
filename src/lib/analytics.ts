// Lightweight Plausible analytics wrapper.
//
// Loads only when VITE_PLAUSIBLE_DOMAIN is set (so dev/local does not track).
// Uses Plausible's hash-routing build (`script.hash.js`) because the app runs
// on HashRouter — the default script would not register hash route changes.

const DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined

type PlausibleFn = (event: string, opts?: { props?: Record<string, string | number | boolean> }) => void

declare global {
  interface Window {
    plausible?: PlausibleFn & { q?: unknown[] }
  }
}

export function initAnalytics(): void {
  if (!DOMAIN || typeof window === 'undefined') return
  if (document.querySelector('script[data-plausible]')) return

  // Queue stub so events fired before the script loads are not lost.
  window.plausible =
    window.plausible ||
    (function () {
      ;(window.plausible!.q = window.plausible!.q || []).push(arguments)
    } as unknown as PlausibleFn)

  const s = document.createElement('script')
  s.defer = true
  s.setAttribute('data-domain', DOMAIN)
  s.setAttribute('data-plausible', '1')
  s.src = 'https://plausible.io/js/script.hash.js'
  document.head.appendChild(s)
}

export function track(event: string, props?: Record<string, string | number | boolean>): void {
  if (typeof window === 'undefined' || !window.plausible) return
  window.plausible(event, props ? { props } : undefined)
}
