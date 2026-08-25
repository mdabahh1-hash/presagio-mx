// La app usa HashRouter, así que las rutas "reales" viven después del `#`
// (`/#/mercado/:id`). Los enlaces compartidos usan `/m/:id` (página OG servida
// por `api/m/[id].js`, que redirige a la ruta hash). Si Vercel sirve el
// `index.html` del SPA en lugar de esa función (o alguien pega un path sin `#`),
// el usuario caería en la portada. Este fallback corre antes del render y
// convierte el path en su ruta hash equivalente.

export function redirectPathToHash(): void {
  try {
    const { pathname, search, hash } = window.location
    if (pathname === '/' || pathname === '/index.html') return
    if (hash && hash !== '#' && hash !== '#/') return

    let route = pathname.replace(/\/+$/, '')
    const share = route.match(/^\/(?:api\/)?m\/(.+)$/)
    if (share) route = `/mercado/${share[1]}`

    window.history.replaceState({}, '', `/${search}#${route}`)
  } catch {
    /* ignore */
  }
}
