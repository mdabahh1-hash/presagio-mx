import { useLayoutEffect, useRef } from 'react'

// Ajusta el título de una tarjeta a su caja de alto fijo: prueba los tamaños de
// mayor a menor y se queda con el primero que cabe entero. El número de líneas
// no se fija a mano, sale de la caja (alto / alto de línea). Si ni el más chico
// cabe, el clamp deja «…» como red de seguridad (con `title` completo al pasar
// el mouse); en producción esos títulos se reescriben, no se dejan así.
export type Escalon = readonly [px: number, lineHeight: number]

export const ESCALONES: readonly Escalon[] = [[15, 1.35], [14, 1.3], [13, 1.2]]
export const ESCALONES_MOVIL: readonly Escalon[] = [[14, 1.3], [13, 1.2]]

interface Entrada {
  el: HTMLElement
  escalones: readonly Escalon[]
}

// Todos los títulos montados, para remedir cuando cargue la fuente
const vivos = new Set<Entrada>()
// Los que esperan medición: se miden TODOS juntos, por fases, para no provocar
// un reflow por tarjeta (3 layouts para la rejilla entera, no 3 por tarjeta).
const cola = new Set<Entrada>()
let programado = false

function programar() {
  if (programado) return
  programado = true
  // microtask: corre después de todos los efectos de layout y antes de pintar,
  // así no se ve el salto de tamaño
  queueMicrotask(medir)
}

const MAX_LINEAS = 4

function medir() {
  programado = false
  if (!cola.size) return
  const items = [...cola]
  cola.clear()
  // Alto disponible = el que le deja la cabecera (el título es quien cede)
  const estado = items.map(e => ({ e, i: 0, cabe: false, hueco: 0 }))
  for (const s of estado) {
    s.e.el.style.height = 'auto'
    s.e.el.style.webkitLineClamp = 'unset'
  }
  for (const s of estado) s.hueco = s.e.el.parentElement?.clientHeight ?? 0

  const pasos = Math.max(...items.map(e => e.escalones.length))
  for (let paso = 0; paso < pasos; paso++) {
    const activos = estado.filter(s => !s.cabe && s.i < s.e.escalones.length)
    if (!activos.length) break
    // escribe en todos…
    for (const s of activos) {
      const [px, lh] = s.e.escalones[s.i]
      s.e.el.style.fontSize = `${px}px`
      s.e.el.style.lineHeight = `${lh}`
    }
    // …y luego lee en todos: un solo layout por escalón, no uno por tarjeta
    for (const s of activos) {
      const [px, lh] = s.e.escalones[s.i]
      const lineas = Math.min(MAX_LINEAS, Math.floor(s.hueco / (px * lh)))
      if (s.e.el.scrollHeight <= lineas * px * lh + 0.5) s.cabe = true
      else s.i++
    }
  }

  // El alto del título queda EXACTO a sus líneas: si sobrara espacio, Chrome pinta
  // media línea de más por debajo del clamp.
  for (const s of estado) {
    const [px, lh] = s.e.escalones[Math.min(s.i, s.e.escalones.length - 1)]
    const lineas = Math.max(1, Math.min(MAX_LINEAS, Math.floor(s.hueco / (px * lh))))
    s.e.el.style.fontSize = `${px}px`
    s.e.el.style.lineHeight = `${lh}`
    s.e.el.style.height = `${(lineas * px * lh).toFixed(2)}px`
    s.e.el.style.webkitLineClamp = String(lineas)
  }
}

export function useFitText<T extends HTMLElement>(texto: string, escalones: readonly Escalon[] = ESCALONES) {
  const ref = useRef<T>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const entrada: Entrada = { el, escalones }
    vivos.add(entrada)
    cola.add(entrada)
    programar()
    // el alto de la caja es fijo: el observer solo reacciona al ancho
    const ro = new ResizeObserver(() => { cola.add(entrada); programar() })
    ro.observe(el)
    return () => { vivos.delete(entrada); cola.delete(entrada); ro.disconnect() }
  }, [texto, escalones])
  return ref
}

// Con la fuente de respaldo las métricas son otras y elegiría mal el tamaño:
// al cargar Inter se remide todo una sola vez.
if (typeof document !== 'undefined' && document.fonts) {
  document.fonts.ready.then(() => {
    if (!vivos.size) return
    for (const e of vivos) cola.add(e)
    programar()
  }).catch(() => {})
}
