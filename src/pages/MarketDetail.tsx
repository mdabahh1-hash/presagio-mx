import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { marketsApi, tradesApi, type ApiMarket, type ApiComment, type ApiPricePoint } from '../lib/api'
import { marketSocket } from '../lib/websocket'
import { useAuth } from '../lib/AuthContext'
import { FullChart } from '../components/SparkChart'
import type { PricePoint } from '../types'

function formatVolume(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return v.toFixed(0)
}

function daysLeft(endsAt: string, status?: string) {
  if (status === 'resolved_yes' || status === 'resolved_no') return 'Resuelto'
  if (status === 'closed') return 'Cerrado'
  if (status === 'pending_resolution') return 'Pendiente'
  const diff = new Date(endsAt).getTime() - Date.now()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days < 0) return 'Cerrado'
  if (days === 0) return 'Hoy'
  if (days === 1) return '1 día'
  return `${days} días`
}

const CATEGORY_COLORS: Record<string, string> = {
  'Política MX': '#FFD700', 'Economía': '#FFD700', 'Deportes': '#00FF88',
  'Global': '#a0c4ff', 'Tech': '#a060ff',
}

export function MarketDetail() {
  const { id } = useParams<{ id: string }>()
  const { user, refreshUser } = useAuth()

  const [market, setMarket] = useState<ApiMarket | null>(null)
  const [yesPrice, setYesPrice] = useState(50)
  const [volume, setVolume] = useState(0)
  const [history, setHistory] = useState<PricePoint[]>([])
  const [comments, setComments] = useState<ApiComment[]>([])
  const [loading, setLoading] = useState(true)

  const [side, setSide] = useState<'YES' | 'NO'>('YES')
  const [amount, setAmount] = useState(100)
  const [trading, setTrading] = useState(false)
  const [tradeError, setTradeError] = useState<string | null>(null)
  const [tradeSuccess, setTradeSuccess] = useState<string | null>(null)

  const [comment, setComment] = useState('')
  const [chartPeriod, setChartPeriod] = useState<'7d' | '30d' | 'all'>('all')

  useEffect(() => {
    if (!id) return
    Promise.all([
      marketsApi.get(id),
      marketsApi.history(id, 90),
      marketsApi.comments(id),
    ]).then(([m, hist, cmts]) => {
      setMarket(m)
      setYesPrice(m.yes_price)
      setVolume(m.volume)
      setHistory(hist.map((p: ApiPricePoint) => ({ date: p.recorded_at.slice(0, 10), price: p.yes_price })))
      setComments(cmts)
    }).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!id) return
    marketSocket.connect(id)
    const unsub = marketSocket.subscribe((data) => {
      if (data.type === 'price_update' && data.market_id === id) {
        if (typeof data.yes_price === 'number') setYesPrice(data.yes_price as number)
        if (typeof data.volume === 'number') setVolume(data.volume as number)
        setHistory(prev => [...prev, { date: new Date().toISOString().slice(0, 10), price: data.yes_price as number }])
      }
      if (data.event === 'new_comment' && data.market_id === id) {
        marketsApi.comments(id).then(setComments).catch(() => {})
      }
    })
    return () => {
      unsub()
      marketSocket.disconnect()
    }
  }, [id])

  const chartData = (() => {
    if (chartPeriod === '7d') return history.slice(-7)
    if (chartPeriod === '30d') return history.slice(-30)
    return history
  })()

  const handleTrade = async () => {
    if (!user) { setTradeError('Inicia sesión para operar'); return }
    if (!id) return
    setTrading(true)
    setTradeError(null)
    setTradeSuccess(null)
    try {
      const result = await tradesApi.execute(id, side, amount)
      setYesPrice(result.new_yes_price)
      setTradeSuccess(`Compraste ${result.shares.toFixed(2)} acciones ${side} por ${result.cost.toFixed(0)} PT`)
      await refreshUser()
      setTimeout(() => setTradeSuccess(null), 4000)
    } catch (e: any) {
      setTradeError(e.message)
    } finally {
      setTrading(false)
    }
  }

  const handlePostComment = async () => {
    if (!user || !comment.trim() || !id) return
    try {
      const newComment = await marketsApi.postComment(id, comment.trim())
      setComments(prev => [newComment, ...prev])
      setComment('')
    } catch {}
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 24px', textAlign: 'center' }}>
        <div style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>Cargando mercado...</div>
      </div>
    )
  }

  if (!market) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>Mercado no encontrado.</p>
        <Link to="/mercados" style={{ color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}>
          ← Volver a mercados
        </Link>
      </div>
    )
  }

  const catColor = CATEGORY_COLORS[market.category] || '#8888cc'
  const noPrice = Math.round(100 - yesPrice)
  const potential = side === 'YES'
    ? ((amount / (yesPrice / 100)) - amount).toFixed(0)
    : ((amount / (noPrice / 100)) - amount).toFixed(0)
  const yesColor = yesPrice >= 65 ? 'var(--green)' : yesPrice <= 35 ? 'var(--red)' : 'var(--gold)'

  return (
    <div className="page-container" style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      {/* Breadcrumb */}
      <div className="anim-1" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 28, fontSize: '0.78rem' }}>
        <Link to="/mercados" style={{ color: 'var(--text-tertiary)', textDecoration: 'none', transition: 'color 0.15s' }}>
          Mercados
        </Link>
        <span style={{ color: 'var(--border-default)' }}>›</span>
        <span style={{ color: catColor }}>{market.category}</span>
        <span style={{ color: 'var(--border-default)' }}>›</span>
        <span style={{ color: 'var(--text-secondary)' }}>{market.question.slice(0, 42)}…</span>
      </div>

      <div className="market-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 28, alignItems: 'start' }}>

        {/* ── Left column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Market header */}
          <div className="anim-1 card" style={{ padding: '28px 30px 26px' }}>
            {/* Badges row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
              <span style={{
                fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: catColor,
                background: `${catColor}15`, border: `1px solid ${catColor}35`,
                padding: '3px 10px', borderRadius: 99,
              }}>
                {market.category}
              </span>
              {market.trending && (
                <span style={{
                  fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em',
                  textTransform: 'uppercase', color: 'var(--gold)',
                  background: 'rgba(255, 208, 96, 0.1)',
                  border: '1px solid rgba(255, 208, 96, 0.25)',
                  padding: '3px 8px', borderRadius: 99,
                }}>
                  ▲ TENDENCIA
                </span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                <div className="live-dot" />
                <span style={{ fontSize: '0.62rem', color: 'var(--green)', fontWeight: 700, letterSpacing: '0.08em' }}>EN VIVO</span>
              </div>
            </div>

            {/* Resolved banner */}
            {(market.status === 'resolved_yes' || market.status === 'resolved_no') && (
              <div style={{
                background: market.status === 'resolved_yes' ? 'rgba(0, 232, 125, 0.08)' : 'rgba(255, 45, 85, 0.08)',
                border: `1px solid ${market.status === 'resolved_yes' ? 'var(--green)' : 'var(--red)'}`,
                borderRadius: 10, padding: '12px 16px', marginBottom: 20,
                fontSize: '0.875rem', fontWeight: 700,
                color: market.status === 'resolved_yes' ? 'var(--green)' : 'var(--red)',
              }}>
                Resultado oficial: {market.status === 'resolved_yes' ? 'SÍ ✓' : 'NO ✗'}
              </div>
            )}

            {/* Question */}
            <h1 className="font-display" style={{
              fontSize: 'clamp(1.25rem, 3vw, 1.85rem)',
              fontWeight: 700, letterSpacing: '-0.025em',
              margin: '0 0 18px', lineHeight: 1.25,
            }}>
              {market.question}
            </h1>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 28px', lineHeight: 1.7 }}>
              {market.description}
            </p>

            {/* Big probability display */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 20 }}>
              <div>
                <span style={{
                  fontSize: 'clamp(3rem, 6vw, 4.5rem)',
                  fontWeight: 800, fontFamily: 'DM Mono',
                  color: yesColor, lineHeight: 1,
                  letterSpacing: '-0.04em',
                }}>
                  {Math.round(yesPrice)}%
                </span>
                <span style={{ fontSize: '1rem', color: 'var(--text-tertiary)', marginLeft: 10, fontWeight: 600 }}>SÍ</span>
              </div>
              <div style={{ paddingBottom: 8, opacity: 0.5 }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'DM Mono', color: 'var(--text-secondary)' }}>
                  {noPrice}%
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginLeft: 6, fontWeight: 600 }}>NO</span>
              </div>
            </div>

            {/* Dual probability bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600, letterSpacing: '0.05em' }}>
                <span style={{ color: 'var(--green)' }}>SÍ · {Math.round(yesPrice)}%</span>
                <span style={{ color: 'var(--red)' }}>NO · {noPrice}%</span>
              </div>
              <div className="prob-bar-dual">
                <div style={{
                  width: `${yesPrice}%`,
                  background: 'linear-gradient(90deg, var(--green), rgba(0, 232, 125, 0.55))',
                  transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                }} />
                <div style={{
                  flex: 1,
                  background: 'linear-gradient(90deg, rgba(255, 45, 85, 0.4), var(--red))',
                }} />
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="anim-2 card" style={{ padding: '24px 24px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div className="exchange-header">Probabilidad histórica</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['7d', '30d', 'all'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setChartPeriod(p)}
                    style={{
                      background: chartPeriod === p ? 'var(--bg-elevated)' : 'transparent',
                      border: `1px solid ${chartPeriod === p ? 'var(--border-default)' : 'transparent'}`,
                      borderRadius: 6, padding: '4px 12px',
                      fontSize: '0.72rem', fontWeight: 700,
                      color: chartPeriod === p ? 'var(--text-primary)' : 'var(--text-tertiary)',
                      cursor: 'pointer', fontFamily: 'DM Mono',
                      transition: 'all 0.15s',
                    }}
                  >
                    {p === 'all' ? 'TODO' : p.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            {chartData.length > 1 ? (
              <FullChart data={chartData} height={200} />
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                Sin suficientes datos de historial aún
              </div>
            )}
          </div>

          {/* Stats grid */}
          <div className="anim-3 market-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { label: 'Volumen', value: formatVolume(volume), unit: 'PT', color: 'var(--text-primary)' },
              { label: 'Operaciones', value: market.num_trades.toString(), unit: '', color: 'var(--text-primary)' },
              { label: 'Cierre', value: daysLeft(market.ends_at, market.status), unit: '', color: 'var(--gold)' },
              { label: 'Comentarios', value: comments.length.toString(), unit: '', color: 'var(--text-primary)' },
            ].map(stat => (
              <div key={stat.label} className="stat-card" style={{ textAlign: 'center' }}>
                <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: 800, color: stat.color, lineHeight: 1 }}>
                  {stat.value}
                  {stat.unit && <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginLeft: 3, fontWeight: 600 }}>{stat.unit}</span>}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 6, fontWeight: 500 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Resolution criteria */}
          <div className="anim-4 card" style={{ padding: '22px 26px' }}>
            <div className="exchange-header" style={{ marginBottom: 14 }}>Criterios de resolución</div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              {market.resolution_criteria}
            </p>
            <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Fecha de cierre:</span>
              <span className="font-mono" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {new Date(market.ends_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Comments */}
          <div className="anim-5 card" style={{ padding: '24px 26px' }}>
            <div className="exchange-header" style={{ marginBottom: 20 }}>
              Discusión
              <span style={{
                marginLeft: 8, background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 99, padding: '1px 8px',
                fontSize: '0.68rem', color: 'var(--text-tertiary)',
                fontFamily: 'DM Mono', fontWeight: 700,
              }}>
                {comments.length}
              </span>
            </div>
            {user ? (
              <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
                <div className="avatar" style={{ flexShrink: 0, marginTop: 3 }}>
                  {user.display_name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Comparte tu análisis..."
                    rows={3}
                    style={{
                      width: '100%',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 10, padding: '12px 14px',
                      fontSize: '0.875rem', color: 'var(--text-primary)',
                      fontFamily: 'DM Sans', resize: 'vertical', outline: 'none',
                      transition: 'border-color 0.15s',
                    }}
                  />
                  <button
                    className="btn-comment-submit"
                    onClick={handlePostComment}
                    style={{
                      marginTop: 10,
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 8, padding: '9px 18px',
                      fontSize: '0.78rem', color: 'var(--text-primary)',
                      fontWeight: 700, cursor: 'pointer', fontFamily: 'DM Sans',
                      letterSpacing: '0.04em', transition: 'all 0.15s',
                    }}
                  >
                    Publicar
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: 24 }}>
                <a href="/api/auth/google" style={{ color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}>
                  Inicia sesión
                </a>{' '}para comentar
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {comments.map(c => (
                <div key={c.id} style={{ display: 'flex', gap: 12 }}>
                  <div className="avatar" style={{ flexShrink: 0, marginTop: 2 }}>
                    {c.user.display_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>{c.user.display_name}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                        {new Date(c.created_at).toLocaleDateString('es-MX')}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {c.text}
                    </p>
                    <button
                      onClick={() =>
                        marketsApi.likeComment(market.id, c.id)
                          .then(updated => setComments(prev => prev.map(x => x.id === updated.id ? updated : x)))
                          .catch(() => {})
                      }
                      style={{
                        marginTop: 8, background: 'none', border: 'none',
                        fontSize: '0.7rem', color: 'var(--text-tertiary)',
                        cursor: 'pointer', padding: 0, transition: 'color 0.15s',
                      }}
                    >
                      ♥ {c.likes}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Trading panel ── */}
        <div className="market-trading-panel" style={{ position: 'sticky', top: 80 }}>
          {market.status !== 'open' ? (
            <div className="anim-2 card" style={{ padding: '32px 26px', textAlign: 'center' }}>
              {market.status === 'pending_resolution' && (
                <>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: 'rgba(255, 208, 96, 0.1)',
                    border: '1px solid rgba(255, 208, 96, 0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px', fontSize: '1.4rem',
                  }}>⏳</div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gold)', margin: '0 0 10px' }}>
                    Pendiente de resolución
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.65 }}>
                    Este mercado cerró. En breve se declarará el resultado y se distribuirán los puntos.
                  </p>
                </>
              )}
              {(market.status === 'resolved_yes' || market.status === 'resolved_no') && (
                <>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: market.status === 'resolved_yes' ? 'rgba(0,232,125,0.1)' : 'rgba(255,45,85,0.1)',
                    border: `1px solid ${market.status === 'resolved_yes' ? 'var(--green)' : 'var(--red)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px', fontSize: '1.4rem',
                  }}>
                    {market.status === 'resolved_yes' ? '✓' : '✕'}
                  </div>
                  <h3 style={{
                    fontSize: '1rem', fontWeight: 700, margin: '0 0 10px',
                    color: market.status === 'resolved_yes' ? 'var(--green)' : 'var(--red)',
                  }}>
                    Resuelto: {market.status === 'resolved_yes' ? 'SÍ ganó' : 'NO ganó'}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.65 }}>
                    Los puntos ya fueron distribuidos a los ganadores.
                  </p>
                </>
              )}
              {market.status === 'closed' && (
                <>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px', fontSize: '1.4rem',
                  }}>🔒</div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 10px' }}>
                    Mercado cerrado
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', margin: 0 }}>
                    Este mercado ya no acepta operaciones.
                  </p>
                </>
              )}
              {market.status === 'cancelled' && (
                <>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px', fontSize: '1.4rem',
                  }}>🚫</div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-tertiary)', margin: '0 0 10px' }}>
                    Mercado cancelado
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', margin: 0 }}>
                    Este mercado fue cancelado.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="anim-2 card" style={{ padding: '24px 22px' }}>
              <div className="exchange-header" style={{ marginBottom: 20 }}>Operar</div>

              {/* YES / NO selector */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 22 }}>
                {(['YES', 'NO'] as const).map(s => {
                  const isSelected = side === s
                  const color = s === 'YES' ? 'var(--green)' : 'var(--red)'
                  const price = s === 'YES' ? Math.round(yesPrice) : noPrice
                  return (
                    <button
                      key={s}
                      onClick={() => setSide(s)}
                      style={{
                        padding: '16px 12px', borderRadius: 12, cursor: 'pointer',
                        border: `2px solid ${isSelected ? color : 'var(--border-subtle)'}`,
                        background: isSelected
                          ? s === 'YES' ? 'rgba(0, 232, 125, 0.1)' : 'rgba(255, 45, 85, 0.1)'
                          : 'transparent',
                        transition: 'all 0.15s', textAlign: 'center',
                      }}
                    >
                      <div style={{
                        fontSize: '0.65rem', fontWeight: 800,
                        color: isSelected ? color : 'var(--text-tertiary)',
                        letterSpacing: '0.12em', marginBottom: 6,
                      }}>
                        {s}
                      </div>
                      <div className="font-mono" style={{
                        fontSize: '1.4rem', fontWeight: 800,
                        color: isSelected ? color : 'var(--text-secondary)',
                        lineHeight: 1, letterSpacing: '-0.02em',
                      }}>
                        {price}%
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Amount input */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.03em' }}>CANTIDAD</span>
                  {user && (
                    <span style={{ color: 'var(--gold)', fontFamily: 'DM Mono', fontWeight: 700, fontSize: '0.75rem' }}>
                      {Math.floor(user.points).toLocaleString('es-MX')} PT
                    </span>
                  )}
                </label>
                <div style={{
                  display: 'flex',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 10, overflow: 'hidden',
                }}>
                  <button
                    className="amount-adjust-btn"
                    onClick={() => setAmount(a => Math.max(10, a - 50))}
                    style={{
                      background: 'transparent', border: 'none',
                      padding: '12px 16px', color: 'var(--text-secondary)',
                      cursor: 'pointer', fontSize: '1.2rem', fontWeight: 300,
                    }}
                  >−</button>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(Math.max(10, parseInt(e.target.value) || 10))}
                    style={{
                      flex: 1, background: 'transparent', border: 'none',
                      outline: 'none', textAlign: 'center',
                      fontSize: '1.05rem', fontWeight: 800,
                      fontFamily: 'DM Mono', color: 'var(--text-primary)',
                    }}
                  />
                  <span style={{
                    display: 'flex', alignItems: 'center',
                    paddingRight: 12, fontSize: '0.72rem',
                    fontWeight: 800, color: 'var(--gold)',
                  }}>PT</span>
                  <button
                    className="amount-adjust-btn"
                    onClick={() => setAmount(a => a + 50)}
                    style={{
                      background: 'transparent', border: 'none',
                      padding: '12px 16px', color: 'var(--text-secondary)',
                      cursor: 'pointer', fontSize: '1.2rem', fontWeight: 300,
                    }}
                  >+</button>
                </div>
                <input
                  type="range" min={10} max={1000} step={10}
                  value={amount}
                  onChange={e => setAmount(parseInt(e.target.value))}
                  style={{ width: '100%', marginTop: 10 }}
                />
              </div>

              {/* Preset amounts */}
              <div className="amount-presets" style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                {[50, 100, 250, 500].map(v => (
                  <button
                    key={v}
                    onClick={() => setAmount(v)}
                    style={{
                      flex: 1,
                      background: amount === v ? 'var(--bg-elevated)' : 'transparent',
                      border: `1px solid ${amount === v ? 'var(--border-default)' : 'var(--border-subtle)'}`,
                      borderRadius: 8, padding: '7px 4px',
                      fontSize: '0.72rem',
                      color: amount === v ? 'var(--text-primary)' : 'var(--text-tertiary)',
                      cursor: 'pointer', fontFamily: 'DM Mono', fontWeight: 700,
                      transition: 'all 0.15s',
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>

              {/* Trade summary */}
              <div style={{
                background: 'var(--bg-surface)',
                borderRadius: 10, padding: '14px 16px',
                marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>Precio actual</span>
                  <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                    {side === 'YES' ? Math.round(yesPrice) : noPrice}%
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>Ganancia potencial</span>
                  <span className="font-mono" style={{ color: 'var(--green)', fontWeight: 800 }}>
                    +{potential} PT
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>Máx. pérdida</span>
                  <span className="font-mono" style={{ color: 'var(--red)', fontWeight: 700 }}>
                    -{amount} PT
                  </span>
                </div>
              </div>

              {/* Error / Success */}
              {tradeError && (
                <div style={{
                  margin: '0 0 14px', fontSize: '0.8rem', color: 'var(--red)',
                  background: 'rgba(255, 45, 85, 0.08)',
                  border: '1px solid rgba(255, 45, 85, 0.2)',
                  borderRadius: 8, padding: '10px 14px',
                }}>
                  {tradeError}
                </div>
              )}
              {tradeSuccess && (
                <div style={{
                  margin: '0 0 14px', fontSize: '0.8rem', color: 'var(--green)',
                  background: 'rgba(0, 232, 125, 0.08)',
                  border: '1px solid rgba(0, 232, 125, 0.2)',
                  borderRadius: 8, padding: '10px 14px',
                }}>
                  ✓ {tradeSuccess}
                </div>
              )}

              {/* Buy button */}
              <button
                onClick={handleTrade}
                disabled={trading}
                style={{
                  width: '100%', padding: '16px',
                  background: side === 'YES'
                    ? 'linear-gradient(135deg, #00e87d, #00ba64)'
                    : 'linear-gradient(135deg, #ff2d55, #cc1a40)',
                  border: 'none', borderRadius: 12,
                  color: side === 'YES' ? '#001a0d' : '#fff',
                  fontFamily: 'DM Sans', fontWeight: 800,
                  fontSize: '0.92rem', letterSpacing: '0.06em',
                  cursor: trading ? 'wait' : 'pointer',
                  opacity: trading ? 0.7 : 1,
                  boxShadow: side === 'YES'
                    ? '0 6px 28px rgba(0, 232, 125, 0.3)'
                    : '0 6px 28px rgba(255, 45, 85, 0.3)',
                  transition: 'opacity 0.15s, box-shadow 0.2s',
                }}
              >
                {trading ? 'PROCESANDO...' : `COMPRAR ${side} · ${amount} PT`}
              </button>

              {!user && (
                <div style={{ marginTop: 14, textAlign: 'center' }}>
                  <a href="/api/auth/google" style={{ fontSize: '0.82rem', color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}>
                    Inicia sesión para operar →
                  </a>
                </div>
              )}

              <p style={{ margin: '14px 0 0', fontSize: '0.68rem', color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.5 }}>
                VEREDIKT opera con puntos virtuales. No se involucra dinero real.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
