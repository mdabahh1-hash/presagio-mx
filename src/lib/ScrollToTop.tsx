import { useEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// Al navegar a una ruta nueva (PUSH/REPLACE) la página arranca arriba.
// En POP (botón atrás) no se toca: el navegador restaura la posición previa.
// `behavior: 'instant'` a propósito: con un scroll animado la página nueva
// se vería "deslizándose" hacia arriba.
export function ScrollToTop() {
  const { pathname } = useLocation()
  const navType = useNavigationType()
  useEffect(() => {
    if (navType === 'POP') return
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname, navType])
  return null
}
