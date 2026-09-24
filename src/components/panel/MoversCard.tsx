import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { marketsApi, type ApiMover } from '../../lib/api'
import { SparkChart } from '../SparkChart'
import { Tabs } from '../Tabs'
import { cleanLabel } from '../../lib/mapMarket'
import { probText } from '../../lib/prices'

const LIMIT = 5
type Ventana = 24 | 168

// Panel: los mercados que más cambiaron de probabilidad (GET /markets/movers), con la
// mini gráfica que ya trae el endpoint. Sin movimientos en ninguna ventana no se monta.
export function MoversCard({ category }: { category: string }) {
  const { t } = useTranslation()
  const [hours, setHours] = useState<Ventana>(168)
  const [movers, setMovers] = useState<ApiMover[] | null>(null)

  useEffect(() => {
    let alive = true
    setMovers(null)
    marketsApi.movers(hours, LIMIT, { category }).then(m => { if (alive) setMovers(m) }).catch(() => { if (alive) setMovers([]) })
    return () => { alive = false }
  }, [category, hours])

  // Semana vacía: nada que enseñar (24 h vacío sí se enseña, con su aviso)
  if (hours === 168 && movers?.length === 0) return null

  return (
    <div className="card" style={{ padding: '16px 18px 10px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <h3 className="section-title">{t('panel.movers')}</h3>
        <Tabs<string>
          size="sm"
          ariaLabel={t('panel.movers')}
          items={[{ key: '24', label: t('panel.movers24h') }, { key: '168', label: t('panel.movers7d') }]}
          active={String(hours)}
          onChange={k => setHours(Number(k) as Ventana)}
        />
      </div>
      {movers === null ? (
        [...Array(LIMIT)].map((_, i) => <div key={i} className="skeleton" style={{ height: 44, marginBottom: 4 }} />)
      ) : movers.length === 0 ? (
        <p className="meta-label" style={{ padding: '16px 0' }}>{t('panel.moversEmpty')}</p>
      ) : movers.map(m => {
        const up = m.change > 0
        const color = up ? 'var(--green)' : 'var(--red)'
        return (
          <Link key={`${m.id}-${m.outcome_key ?? ''}`} to={`/mercado/${m.id}`} className="list-row is-link" style={{ padding: '8px 0', gap: 12 }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={cleanLabel(m.question)}>
                {cleanLabel(m.question)}
              </span>
              {m.outcome_label && <span className="meta-label">{cleanLabel(m.outcome_label)}</span>}
            </span>
            <SparkChart data={m.points.map(p => ({ date: p.recorded_at, price: p.price }))} width={72} height={28} color={color} showArea={false} />
            <span style={{ width: 52, textAlign: 'right', flexShrink: 0 }}>
              <span className="num" style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{probText(m.price, m.status)}</span>
              <span className="num" style={{ fontSize: 12, fontWeight: 600, color }}>{up ? '+' : '−'}{Math.abs(Math.round(m.change))}</span>
            </span>
          </Link>
        )
      })}
    </div>
  )
}
