import { useCallback, useRef, useState } from 'react'

// Ancho real (px) de un contenedor, vía ResizeObserver. Devuelve un callback
// ref (sobrevive remontajes) y el ancho medido (0 hasta la primera medición).
// Los charts SVG usan viewBox de ancho fijo: sin pasarles el ancho real, en
// móvil el texto de los ejes se escala a ~5px y las etiquetas se enciman.
export function useElementWidth(): [(node: HTMLElement | null) => void, number] {
  const [width, setWidth] = useState(0)
  const roRef = useRef<ResizeObserver | null>(null)
  const ref = useCallback((node: HTMLElement | null) => {
    roRef.current?.disconnect()
    roRef.current = null
    if (!node) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width
      if (w) setWidth(Math.round(w))
    })
    ro.observe(node)
    roRef.current = ro
  }, [])
  return [ref, width]
}
