import { useEffect, useRef, useState } from 'react'
import { marketsApi } from './api'
import type { PricePoint } from '../types'

const BATCH = 6

// Historial corto por fila (sparkline), perezoso y sin bloquear el render: el
// listado no trae historial, así que se pide /markets/{id}/history?days=N solo
// para los ids que están en pantalla, una vez por id y en lotes de BATCH.
// undefined = pendiente; null = falló; [] = sin datos.
export function useSparks(ids: string[], days = 7): Record<string, PricePoint[] | null> {
  const [sparks, setSparks] = useState<Record<string, PricePoint[] | null>>({})
  const requested = useRef(new Set<string>())
  const mounted = useRef(true)
  // StrictMode monta/desmonta/monta: reponer el flag en cada montaje real
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const key = ids.join('|')
  useEffect(() => {
    const pending = ids.filter(id => !requested.current.has(id))
    if (pending.length === 0) return
    pending.forEach(id => requested.current.add(id))
    ;(async () => {
      for (let i = 0; i < pending.length; i += BATCH) {
        const batch = pending.slice(i, i + BATCH)
        const results = await Promise.all(batch.map(id =>
          marketsApi.history(id, days)
            .then(h => h
              .filter(p => !p.outcome_key && p.yes_price > 0)
              .map(p => ({ date: p.recorded_at, price: p.yes_price })))
            .catch(() => null),
        ))
        if (!mounted.current) return
        setSparks(prev => {
          const next = { ...prev }
          batch.forEach((id, j) => { next[id] = results[j] })
          return next
        })
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, days])

  return sparks
}
