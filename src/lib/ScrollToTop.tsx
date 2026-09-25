import { useEffect, useLayoutEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// Posición de scroll de cada entrada del historial (location.key)
const posiciones = new Map<string, number>()
let actual = ''

// Al navegar a una ruta nueva (PUSH/REPLACE) la página arranca arriba.
// En POP (botón atrás) se vuelve a donde estaba: el navegador no puede hacerlo
// solo porque la página todavía no tiene su alto cuando restaura (la lista llega
// después), así que se reintenta cada frame hasta que el alto alcance, máx. 1.5 s.
// `behavior: 'instant'` a propósito: con un scroll animado la página nueva
// se vería "deslizándose" hacia arriba.
export function ScrollToTop() {
  const { pathname, key } = useLocation()
  const navType = useNavigationType()

  // Guarda la posición de la entrada actual. Un solo listener y la key en una
  // variable que se cambia en el layout effect: los eventos de scroll llegan en el
  // frame siguiente, así que el recorte al pintar la página nueva ya cuenta para ella
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    const guardar = () => posiciones.set(actual, window.scrollY)
    window.addEventListener('scroll', guardar, { passive: true })
    return () => window.removeEventListener('scroll', guardar)
  }, [])

  useLayoutEffect(() => { actual = key }, [key])

  useLayoutEffect(() => {
    if (navType !== 'POP') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
      return
    }
    const y = posiciones.get(key) ?? 0
    const hasta = Date.now() + 1500
    let frame = 0
    const intentar = () => {
      window.scrollTo({ top: y, left: 0, behavior: 'instant' as ScrollBehavior })
      if (Math.abs(window.scrollY - y) > 2 && Date.now() < hasta) frame = requestAnimationFrame(intentar)
    }
    intentar()
    // Si el usuario mueve la página mientras tanto, se deja de insistir
    const soltar = () => cancelAnimationFrame(frame)
    window.addEventListener('wheel', soltar, { passive: true, once: true })
    window.addEventListener('touchstart', soltar, { passive: true, once: true })
    return () => {
      soltar()
      window.removeEventListener('wheel', soltar)
      window.removeEventListener('touchstart', soltar)
    }
  // pathname: una ruta nueva con la misma key no existe, pero el REPLACE de /?cat= no debe subir
  // la página si la ruta no cambió → la dependencia real es la ruta, y la key solo en POP
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, navType === 'POP' ? key : null])
  return null
}
