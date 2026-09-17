import { useEffect, useState } from 'react'
import { marketsApi, type ApiEnVivo } from './api'
import type { LiveState, Market } from '../types'

const POLL_MS = 60_000
// Misma ventana que app/services/en_vivo.py
const VENTANA_ANTES_MS = 5 * 3_600_000
const VENTANA_DESPUES_MS = 30 * 60_000

export function enVentana(m: Market, now: number = Date.now()): boolean {
  if (m.kind !== 'partido' || !m.kickoffAt) return false
  const t = Date.parse(m.kickoffAt)
  return t >= now - VENTANA_ANTES_MS && t <= now + VENTANA_DESPUES_MS
}

function toLive(e: ApiEnVivo): LiveState {
  return {
    estado: e.estado as LiveState['estado'],
    local: e.local,
    visitante: e.visitante,
    marcadorLocal: e.marcador_local,
    marcadorVisitante: e.marcador_visitante,
    reloj: e.reloj,
    periodo: e.periodo,
  }
}

// Marcador en vivo de la landing de Deportes: sondea GET /markets/en-vivo cada
// minuto mientras haya un partido en ventana; sin partidos, o con el poller
// apagado en el backend ([]), devuelve {} y las filas se ven como siempre.
export function useEnVivo(markets: Market[]): Record<string, LiveState> {
  const [live, setLive] = useState<Record<string, LiveState>>({})
  const hay = markets.some(m => enVentana(m))
  useEffect(() => {
    if (!hay) { setLive({}); return }
    let alive = true
    const load = () => marketsApi.enVivo()
      .then(list => {
        if (!alive) return
        const out: Record<string, LiveState> = {}
        for (const e of list) out[e.market_id] = toLive(e)
        setLive(out)
      })
      .catch(() => {})
    load()
    const id = setInterval(load, POLL_MS)
    return () => { alive = false; clearInterval(id) }
  }, [hay])
  return live
}
