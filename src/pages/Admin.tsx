import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi, type ApiMarket } from '../lib/api'
import { useAuth } from '../lib/AuthContext'

const ADMIN_EMAIL = 'mdabahh@atid.edu.mx'

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  open: { label: 'Abierto', color: 'var(--green)' },
  pending_resolution: { label: '⏳ Pendiente', color: 'var(--gold)' },
  closed: { label: 'Cerrado', color: 'var(--gold)' },
  resolved_yes: { label: 'Resuelto SÍ', color: '#60a5fa' },
  resolved_no: { label: 'Resuelto NO', color: 'var(--red)' },
  resolved: { label: 'Resuelto', color: '#60a5fa' },
  cancelled: { label: 'Cancelado', color: 'var(--text-tertiary)' },
}

export function Admin() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [markets, setMarkets] = useState<ApiMarket[]>([])
  const [fetching, setFetching] = useState(true)
  const [resolving, setResolving] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [selectedOutcomes, setSelectedOutcomes] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!loading && (!user || user.email !== ADMIN_EMAIL)) {
      navigate('/')
    }
  }, [user, loading, navigate])

  useEffect(() => {
    if (user?.email === ADMIN_EMAIL) {
      adminApi.listAllMarkets()
        .then(data => {
          setMarkets(data)
          const defaults: Record<string, string> = {}
          data.forEach(m => {
            if (m.market_type === 'multi' && m.outcomes?.[0]) {
              defaults[m.id] = m.outcomes[0].outcome_key
            }
          })
          setSelectedOutcomes(defaults)
        })
        .finally(() => setFetching(false))
    }
  }, [user])

  const resolveBinary = async (marketId: string, resolution: 'YES' | 'NO') => {
    const market = markets.find(m => m.id === marketId)
    if (!market) return
    if (!confirm(`¿Resolver "${market.question.slice(0, 60)}..." como ${resolution}?`)) return
    setResolving(marketId)
    setMessage(null)
    try {
      const result = await adminApi.resolveMarket(marketId, { resolution })
      setMessage(`✓ Resuelto como ${result.resolution}. ${result.positions_settled} posiciones liquidadas.`)
      setMarkets(await adminApi.listAllMarkets())
    } catch (e: unknown) {
      setMessage(`Error: ${e instanceof Error ? e.message : 'desconocido'}`)
    } finally {
      setResolving(null)
    }
  }

  const resolveMulti = async (marketId: string) => {
    const market = markets.find(m => m.id === marketId)
    const outcomeKey = selectedOutcomes[marketId]
    if (!market || !outcomeKey) return
    const outcomeLabel = market.outcomes?.find(o => o.outcome_key === outcomeKey)?.label ?? outcomeKey
    if (!confirm(`¿Resolver "${market.question.slice(0, 60)}..." con ganador "${outcomeLabel}"?`)) return
    setResolving(marketId)
    setMessage(null)
    try {
      const result = await adminApi.resolveMarket(marketId, { outcome_key: outcomeKey })
      setMessage(`✓ Resuelto: "${outcomeLabel}". ${result.positions_settled} posiciones liquidadas.`)
      setMarkets(await adminApi.listAllMarkets())
    } catch (e: unknown) {
      setMessage(`Error: ${e instanceof Error ? e.message : 'desconocido'}`)
    } finally {
      setResolving(null)
    }
  }

  if (loading || !user) return null

  const resolvable = markets.filter(m =>
    m.status === 'open' || m.status === 'pending_resolution' || m.status === 'closed'
  )
  const resolved = markets.filter(m =>
    m.status === 'resolved_yes' || m.status === 'resolved_no' || m.status === 'resolved'
  )

  return (
    <div className="page-container" style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
        Panel Admin
      </h1>
      <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', marginBottom: 32 }}>
        Resuelve mercados para pagar a los ganadores.
      </p>

      {message && (
        <div style={{
          background: message.startsWith('✓') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${message.startsWith('✓') ? 'var(--green)' : 'var(--red)'}`,
          borderRadius: 8, padding: '12px 16px', marginBottom: 24,
          color: message.startsWith('✓') ? 'var(--green)' : 'var(--red)',
          fontSize: '0.875rem',
        }}>
          {message}
        </div>
      )}

      {fetching ? (
        <p style={{ color: 'var(--text-tertiary)' }}>Cargando mercados...</p>
      ) : (
        <>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Pendientes de resolución ({resolvable.length})
          </h2>
          {resolvable.length === 0 && (
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', marginBottom: 32 }}>
              No hay mercados pendientes.
            </p>
          )}
          {resolvable.map(m => {
            const st = STATUS_LABEL[m.status] ?? { label: m.status, color: 'var(--text-tertiary)' }
            const isMulti = m.market_type === 'multi'
            return (
              <div key={m.id} style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                borderRadius: 12, padding: '16px 20px', marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
              }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {m.question}
                    </span>
                    {isMulti && (
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 700, color: '#a0c4ff',
                        background: 'rgba(160,196,255,0.1)', border: '1px solid rgba(160,196,255,0.3)',
                        padding: '2px 6px', borderRadius: 99,
                      }}>MULTI</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    <span style={{ color: st.color, fontWeight: 600 }}>{st.label}</span>
                    <span>Cierre: {new Date(m.ends_at).toLocaleDateString('es-MX')}</span>
                    <span>Vol: {m.volume.toFixed(0)} PT</span>
                    {!isMulti && <span>YES: {m.yes_price.toFixed(1)}%</span>}
                  </div>
                </div>

                {isMulti ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                      value={selectedOutcomes[m.id] ?? ''}
                      onChange={e => setSelectedOutcomes(prev => ({ ...prev, [m.id]: e.target.value }))}
                      style={{
                        background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                        borderRadius: 8, padding: '8px 12px', color: 'var(--text-primary)',
                        fontSize: '0.8rem', fontFamily: 'DM Sans', cursor: 'pointer',
                      }}
                    >
                      {(m.outcomes ?? []).map(o => (
                        <option key={o.outcome_key} value={o.outcome_key}>
                          {o.label} ({o.price.toFixed(1)}%)
                        </option>
                      ))}
                    </select>
                    <button
                      className="admin-resolve-btn"
                      disabled={resolving === m.id || !selectedOutcomes[m.id]}
                      onClick={() => resolveMulti(m.id)}
                      style={{
                        background: 'var(--gold)', color: '#07071A', border: 'none',
                        borderRadius: 8, padding: '8px 16px', fontWeight: 700,
                        fontSize: '0.8rem', cursor: 'pointer',
                        opacity: (resolving === m.id || !selectedOutcomes[m.id]) ? 0.5 : 1,
                      }}
                    >
                      Resolver ✓
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="admin-resolve-btn"
                      disabled={resolving === m.id}
                      onClick={() => resolveBinary(m.id, 'YES')}
                      style={{
                        background: 'var(--green)', color: '#000', border: 'none',
                        borderRadius: 8, padding: '8px 16px', fontWeight: 700,
                        fontSize: '0.8rem', cursor: 'pointer', opacity: resolving === m.id ? 0.5 : 1,
                      }}
                    >
                      SÍ ✓
                    </button>
                    <button
                      className="admin-resolve-btn"
                      disabled={resolving === m.id}
                      onClick={() => resolveBinary(m.id, 'NO')}
                      style={{
                        background: 'var(--red)', color: '#fff', border: 'none',
                        borderRadius: 8, padding: '8px 16px', fontWeight: 700,
                        fontSize: '0.8rem', cursor: 'pointer', opacity: resolving === m.id ? 0.5 : 1,
                      }}
                    >
                      NO ✗
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {resolved.length > 0 && (
            <>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-secondary)', margin: '32px 0 16px' }}>
                Ya resueltos ({resolved.length})
              </h2>
              {resolved.map(m => {
                const st = STATUS_LABEL[m.status] ?? { label: m.status, color: 'var(--text-tertiary)' }
                const winnerLabel = m.market_type === 'multi' && m.resolved_outcome_key
                  ? (m.outcomes?.find(o => o.outcome_key === m.resolved_outcome_key)?.label ?? m.resolved_outcome_key)
                  : null
                return (
                  <div key={m.id} style={{
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                    borderRadius: 12, padding: '12px 20px', marginBottom: 8, opacity: 0.6,
                    display: 'flex', alignItems: 'center', gap: 16,
                  }}>
                    <span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{m.question}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: st.color }}>
                      {winnerLabel ? `${st.label}: ${winnerLabel}` : st.label}
                    </span>
                  </div>
                )
              })}
            </>
          )}
        </>
      )}
    </div>
  )
}
