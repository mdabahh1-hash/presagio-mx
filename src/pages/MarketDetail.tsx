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
  return v.toFixed(2)
}

function daysLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days < 0) return 'Resuelto'
  if (days === 0) return 'Hoy'
  if (days === 1) return '1 día'
  return `${days} días`
}

const CATEGORY_COLORS: Record<string, string> = {
  'Política MX': '#c94828', 'Economía': '#f0c040', 'Deportes': '#00d084',
  'Global': '#6888ff', 'Tech': '#a060ff',
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

  // Load market data
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

  // WebSocket live updates
  useEffect(() => {
    if (!id) return
    marketSocket.connect(id)
    const unsub = marketSocket.subscribe((data) => {
      if (data.type === 'price_update' && data.market_id === id) {
        if (typeof data.yes_price === 'number') setYesPrice(data.yes_price as number)
        if (typeof data.volume === 'number') setVolume(data.volume as number)
        // Append new price point to chart
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
      setTradeSuccess(`✓ Compraste ${result.shares.toFixed(2)} acciones ${side} por ${result.cost.toFixed(0)} PT`)
      await refreshUser()
      setTimeout(() => setTradeSuccess(null), 4000)
    } catch (e: any) {
      setTradeError(e.message)
    } finally {
      setTrading(false)
    }
  }

  const handlePostComment = async () => {
    if (!user) { return }
    if (!comment.trim() || !id) return
    try {
      const newComment = await marketsApi.postComment(id, comment.trim())
      setComments(prev => [newComment, ...prev])
      setComment('')
    } catch {}
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ color: 'var(--text-tertiary)' }}>Cargando mercado...</div>
      </div>
    )
  }

  if (!market) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Mercado no encontrado.</p>
        <Link to="/mercados" style={{ color: 'var(--gold)' }}>← Volver a mercados</Link>
      </div>
    )
  }

  const catColor = CATEGORY_COLORS[market.category] || '#8888b0'
  const noPrice = Math.round(100 - yesPrice)
  const potential = side === 'YES'
    ? ((amount / (yesPrice / 100)) - amount).toFixed(0)
    : ((amount / (noPrice / 100)) - amount).toFixed(0)

  return (
    <div className="page-container" style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      {/* Breadcrumb */}
      <div className="anim-1" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 24, fontSize: '0.8rem' }}>
        <Link to="/mercados" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Mercados</Link>
        <span style={{ color: 'var(--text-tertiary)' }}>›</span>
        <span style={{ color: 'var(--text-secondary)' }}>{market.category}</span>
        <span style={{ color: 'var(--text-tertiary)' }}>›</span>
        <span style={{ color: 'var(--text-primary)' }}>{market.question.slice(0, 40)}...</span>
      </div>

      <div className="market-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 28, alignItems: 'start' }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Header card */}
          <div className="anim-1 card" style={{ padding: '28px 28px 24px' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: catColor, background: `${catColor}18`, border: `1px solid ${catColor}30`, padding: '3px 10px', borderRadius: 99 }}>
                {market.category}
              </span>
              {market.trending && (
                <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold)', background: 'rgba(240,192,64,0.1)', border: '1px solid rgba(240,192,64,0.2)', padding: '3px 10px', borderRadius: 99 }}>
                  ↑ TENDENCIA
                </span>
              )}
              {/* Live indicator */}
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}>
                <div className="live-dot" />
                <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>EN VIVO</span>
              </span>
            </div>
            <h1 className="font-display" style={{ fontSize: 'clamp(1.2rem, 3vw, 1.75rem)', fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 16px', lineHeight: 1.3 }}>
              {market.question}
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 24px', lineHeight: 1.65 }}>
              {market.description}
            </p>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '3rem', fontWeight: 800, fontFamily: 'JetBrains Mono', color: yesPrice > 50 ? 'var(--green)' : yesPrice < 30 ? 'var(--red)' : 'var(--gold)', lineHeight: 1 }}>
                  {Math.round(yesPrice)}%
                </span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', marginLeft: 8 }}>SÍ</span>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                <span>SÍ · {Math.round(yesPrice)}%</span>
                <span>NO · {noPrice}%</span>
              </div>
              <div style={{ height: 8, background: 'var(--border-subtle)', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${yesPrice}%`, background: 'linear-gradient(90deg, var(--green), rgba(0,208,132,0.6))', transition: 'width 0.6s ease' }} />
                <div style={{ flex: 1, background: 'linear-gradient(90deg, rgba(255,69,96,0.5), var(--red))' }} />
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="anim-2 card" style={{ padding: '24px 24px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 className="font-display" style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Probabilidad histórica
              </h3>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['7d', '30d', 'all'] as const).map(p => (
                  <button key={p} onClick={() => setChartPeriod(p)} style={{ background: chartPeriod === p ? 'var(--bg-elevated)' : 'transparent', border: `1px solid ${chartPeriod === p ? 'var(--border-default)' : 'transparent'}`, borderRadius: 6, padding: '4px 10px', fontSize: '0.72rem', fontWeight: 600, color: chartPeriod === p ? 'var(--text-primary)' : 'var(--text-tertiary)', cursor: 'pointer', fontFamily: 'JetBrains Mono' }}>
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

          {/* Stats */}
          <div className="anim-3 market-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Volumen', value: formatVolume(volume), unit: 'PT' },
              { label: 'Operaciones', value: market.num_trades.toString(), unit: '' },
              { label: 'Cierre', value: daysLeft(market.ends_at), unit: '' },
              { label: 'Comentarios', value: comments.length.toString(), unit: '' },
            ].map(stat => (
              <div key={stat.label} className="stat-card" style={{ textAlign: 'center' }}>
                <div className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {stat.value}{stat.unit && <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginLeft: 3 }}>{stat.unit}</span>}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Resolution criteria */}
          <div className="anim-4 card" style={{ padding: '20px 24px' }}>
            <h3 className="font-display" style={{ margin: '0 0 12px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Criterios de resolución
            </h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              {market.resolution_criteria}
            </p>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Fecha de cierre:</span>
              <span className="font-mono" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {new Date(market.ends_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Comments */}
          <div className="anim-5 card" style={{ padding: '24px' }}>
            <h3 className="font-display" style={{ margin: '0 0 20px', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Discusión · {comments.length}
            </h3>
            {user ? (
              <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                <div className="avatar" style={{ flexShrink: 0, marginTop: 2 }}>
                  {user.display_name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Comparte tu análisis..." rows={3} style={{ width: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '10px 14px', fontSize: '0.875rem', color: 'var(--text-primary)', fontFamily: 'Plus Jakarta Sans', resize: 'vertical', outline: 'none' }} />
                  <button className="btn-comment-submit" onClick={handlePostComment} style={{ marginTop: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '8px 16px', fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer', fontFamily: 'Syne', letterSpacing: '0.04em' }}>
                    Publicar
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: 20 }}>
                <a href="/api/auth/google" style={{ color: 'var(--gold)' }}>Inicia sesión</a> para comentar
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {comments.map(c => (
                <div key={c.id} style={{ display: 'flex', gap: 12 }}>
                  <div className="avatar" style={{ flexShrink: 0, marginTop: 2 }}>
                    {c.user.display_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{c.user.display_name}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{new Date(c.created_at).toLocaleDateString('es-MX')}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>{c.text}</p>
                    <button
                      onClick={() => marketsApi.likeComment(market.id, c.id).then(updated => setComments(prev => prev.map(x => x.id === updated.id ? updated : x))).catch(() => {})}
                      style={{ marginTop: 6, background: 'none', border: 'none', fontSize: '0.72rem', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 0 }}
                    >
                      ♥ {c.likes}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Trading panel */}
        <div className="market-trading-panel" style={{ position: 'sticky', top: 80 }}>
          <div className="anim-2 card" style={{ padding: '24px' }}>
            <h3 className="font-display" style={{ margin: '0 0 20px', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Operar
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
              {(['YES', 'NO'] as const).map(s => (
                <button key={s} onClick={() => setSide(s)} style={{ padding: '14px', borderRadius: 10, border: `2px solid ${side === s ? (s === 'YES' ? 'var(--green)' : 'var(--red)') : 'var(--border-subtle)'}`, background: side === s ? (s === 'YES' ? 'rgba(0,208,132,0.1)' : 'rgba(255,69,96,0.1)') : 'transparent', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: side === s ? (s === 'YES' ? 'var(--green)' : 'var(--red)') : 'var(--text-tertiary)', letterSpacing: '0.1em', marginBottom: 4 }}>{s}</div>
                  <div className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: side === s ? (s === 'YES' ? 'var(--green)' : 'var(--red)') : 'var(--text-secondary)' }}>
                    {s === 'YES' ? Math.round(yesPrice) : noPrice}%
                  </div>
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Cantidad</span>
                {user && <span style={{ color: 'var(--gold)', fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: '0.75rem' }}>Saldo: {Math.floor(user.points).toLocaleString('es-MX')} PT</span>}
              </label>
              <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 8, overflow: 'hidden' }}>
                <button className="amount-adjust-btn" onClick={() => setAmount(a => Math.max(10, a - 50))} style={{ background: 'transparent', border: 'none', padding: '10px 14px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>−</button>
                <input type="number" value={amount} onChange={e => setAmount(Math.max(10, parseInt(e.target.value) || 10))} style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', textAlign: 'center', fontSize: '1rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--text-primary)' }} />
                <span style={{ display: 'flex', alignItems: 'center', paddingRight: 12, fontSize: '0.75rem', fontWeight: 700, color: 'var(--gold)' }}>PT</span>
                <button className="amount-adjust-btn" onClick={() => setAmount(a => a + 50)} style={{ background: 'transparent', border: 'none', padding: '10px 14px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>+</button>
              </div>
              <input type="range" min={10} max={1000} step={10} value={amount} onChange={e => setAmount(parseInt(e.target.value))} style={{ width: '100%', marginTop: 10 }} />
            </div>

            <div className="amount-presets" style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
              {[50, 100, 250, 500].map(v => (
                <button key={v} onClick={() => setAmount(v)} style={{ flex: 1, background: amount === v ? 'var(--bg-elevated)' : 'transparent', border: `1px solid ${amount === v ? 'var(--border-default)' : 'var(--border-subtle)'}`, borderRadius: 6, padding: '6px 4px', fontSize: '0.72rem', color: amount === v ? 'var(--text-primary)' : 'var(--text-tertiary)', cursor: 'pointer', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
                  {v}
                </button>
              ))}
            </div>

            <div style={{ background: 'var(--bg-surface)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Precio actual</span>
                <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{side === 'YES' ? Math.round(yesPrice) : noPrice}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Ganancia potencial</span>
                <span className="font-mono" style={{ color: 'var(--green)', fontWeight: 700 }}>+{potential} PT</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Máx. pérdida</span>
                <span className="font-mono" style={{ color: 'var(--red)', fontWeight: 600 }}>-{amount} PT</span>
              </div>
            </div>

            {tradeError && <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: 'var(--red)', background: 'rgba(255,69,96,0.1)', borderRadius: 8, padding: '8px 12px' }}>{tradeError}</p>}
            {tradeSuccess && <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: 'var(--green)', background: 'rgba(0,208,132,0.1)', borderRadius: 8, padding: '8px 12px' }}>{tradeSuccess}</p>}

            <button
              onClick={handleTrade}
              disabled={trading}
              style={{ width: '100%', padding: '14px', background: side === 'YES' ? 'linear-gradient(135deg, #00d084, #00a868)' : 'linear-gradient(135deg, #ff4560, #cc3040)', border: 'none', borderRadius: 10, color: side === 'YES' ? '#000' : '#fff', fontFamily: 'Syne', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.08em', cursor: trading ? 'wait' : 'pointer', opacity: trading ? 0.7 : 1 }}
            >
              {trading ? 'PROCESANDO...' : `COMPRAR ${side} · ${amount} PT`}
            </button>

            {!user && (
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <a href="/api/auth/google" style={{ fontSize: '0.8rem', color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>
                  Inicia sesión para operar →
                </a>
              </div>
            )}

            <p style={{ margin: '12px 0 0', fontSize: '0.7rem', color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.5 }}>
              PRESAGIO es un mercado de predicciones con puntos virtuales. No se involucra dinero real.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
