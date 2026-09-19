import { useEffect, useState } from 'react'
import { marketsApi } from './api'
import { CATEGORIES, usaLandingGenerica } from './categories'
import type { Category } from '../types'

// Vigencia de la caché: pasado este tiempo, el siguiente montaje vuelve a pedir el
// conteo (y mientras tanto sigue mostrando el valor viejo). Así una categoría recién
// sembrada aparece sola al navegar dentro del SPA, sin recargar.
export const CATEGORIAS_TTL_MS = 5 * 60_000

type Activos = Record<string, number>
let cache: { activos: Activos; fetchedAt: number } | null = null
let inflight: Promise<void> | null = null

// Sin conteo (todavía no llegó, o el backend no lo tiene) se muestran todas. Las
// categorías con landing propia (Deportes, Política, Crypto) nunca se ocultan.
export function categoriasVisibles(activos: Activos | null): Category[] {
  if (!activos) return CATEGORIES
  return CATEGORIES.filter(c => !usaLandingGenerica(c) || (activos[c] ?? 0) > 0)
}

function refrescar(): Promise<void> {
  inflight ??= marketsApi.categorias()
    .then(list => {
      if (!Array.isArray(list)) throw new Error('categorias: respuesta inesperada')
      cache = { activos: Object.fromEntries(list.map(c => [c.categoria, c.activos])), fetchedAt: Date.now() }
    })
    // Fallo (red, 404 por backend viejo): no se guarda; el siguiente montaje reintenta
    .catch(() => {})
    .finally(() => { inflight = null })
  return inflight
}

// Categorías que la barra debe listar. Caché a nivel de módulo con TTL, compartida
// entre CategoryBar y las pestañas de /mercados (una sola petición en vuelo).
export function useCategoriasVisibles(): Category[] {
  const [activos, setActivos] = useState<Activos | null>(cache?.activos ?? null)
  useEffect(() => {
    const vigente = cache && Date.now() - cache.fetchedAt <= CATEGORIAS_TTL_MS
    if (vigente) return
    let alive = true
    refrescar().then(() => { if (alive && cache) setActivos(cache.activos) })
    return () => { alive = false }
  }, [])
  return categoriasVisibles(activos)
}
