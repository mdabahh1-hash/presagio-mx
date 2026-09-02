import { useEffect, useState } from 'react'

// Ticker compartido: un solo setInterval por cadencia para TODAS las tarjetas
// y filas montadas (antes cada MarketCard/MarketRow tenía su propio interval
// de 1s → decenas de re-renders por segundo en listas largas).
// Cadencia: 1s solo cuando falta menos de una hora (el texto cambia por
// minuto/segundo); 30s en el resto de los casos, donde el texto es "4d 3h".
const HOUR_MS = 3_600_000
const FAST_MS = 1000
const SLOW_MS = 30_000

type Listener = () => void
const tickers = new Map<number, { timer: ReturnType<typeof setInterval>; listeners: Set<Listener> }>()

function subscribe(intervalMs: number, fn: Listener): () => void {
  let t = tickers.get(intervalMs)
  if (!t) {
    const listeners = new Set<Listener>()
    const timer = setInterval(() => listeners.forEach(l => l()), intervalMs)
    t = { timer, listeners }
    tickers.set(intervalMs, t)
  }
  t.listeners.add(fn)
  return () => {
    const cur = tickers.get(intervalMs)
    if (!cur) return
    cur.listeners.delete(fn)
    if (cur.listeners.size === 0) {
      clearInterval(cur.timer)
      tickers.delete(intervalMs)
    }
  }
}

// Milisegundos hasta endsAt (compartido por MarketCard y MarketRow).
export function useCountdown(endsAt: string) {
  const compute = () => new Date(endsAt).getTime() - Date.now()
  const [diff, setDiff] = useState(compute)
  const fast = diff > 0 && diff < HOUR_MS
  useEffect(() => {
    setDiff(compute())
    return subscribe(fast ? FAST_MS : SLOW_MS, () => setDiff(compute()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt, fast])
  return diff
}
