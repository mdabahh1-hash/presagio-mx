import { useEffect, useRef, useState } from 'react'
import { marketsApi } from './api'
import type { PricePoint } from '../types'

const BATCH = 6

export interface SparkItem {
  id: string
  // Serie a pintar: null en binarios (filas sin outcome_key); en multi, la
  // opción líder. El historial trae todas las opciones intercaladas.
  outcomeKey: string | null
}

// Historial corto por fila (sparkline), perezoso y sin bloquear el render: el
// listado no trae historial, así que se pide /markets/{id}/history?days=N solo
// para las filas en pantalla, una vez por (id, opción) y en lotes de BATCH.
// El resultado va por id. undefined = pendiente; null = falló; [] = sin datos.
export function useSparks(items: SparkItem[], days = 7): Record<string, PricePoint[] | null> {
  const [sparks, setSparks] = useState<Record<string, PricePoint[] | null>>({})
  const requested = useRef(new Set<string>())
  const mounted = useRef(true)
  // StrictMode monta/desmonta/monta: reponer el flag en cada montaje real
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const keyOf = (it: SparkItem) => `${it.id}|${it.outcomeKey ?? ''}`
  const key = items.map(keyOf).join(',')
  useEffect(() => {
    const pending = items.filter(it => !requested.current.has(keyOf(it)))
    if (pending.length === 0) return
    pending.forEach(it => requested.current.add(keyOf(it)))
    ;(async () => {
      for (let i = 0; i < pending.length; i += BATCH) {
        const batch = pending.slice(i, i + BATCH)
        const results = await Promise.all(batch.map(it =>
          marketsApi.history(it.id, days)
            .then(h => h
              .filter(p => (p.outcome_key ?? null) === it.outcomeKey && p.yes_price > 0)
              .map(p => ({ date: p.recorded_at, price: p.yes_price })))
            .catch(() => null),
        ))
        if (!mounted.current) return
        setSparks(prev => {
          const next = { ...prev }
          batch.forEach((it, j) => { next[it.id] = results[j] })
          return next
        })
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, days])

  return sparks
}
