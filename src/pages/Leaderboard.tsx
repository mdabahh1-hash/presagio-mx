import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { usersApi, type ApiLeaderboardEntry, type LeaderboardPeriod } from '../lib/api'

const MEDAL = ['🥇', '🥈', '🥉']
const PERIODS = ['Hoy', 'Semanal', 'Mensual', 'Todos'] as const
const PERIOD_PARAM: Record<typeof PERIODS[number], LeaderboardPeriod> = {
  Hoy: 'today', Semanal: 'week', Mensual: 'month', Todos: 'all',
}

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

function fmtPnl(n: number) {
  const r = Math.round(n)
  const sign = r >= 0 ? '+' : '−'
  return `${sign}${Math.abs(r).toLocaleString('es-MX')} PT`
}

function fmtVol(n: number) {
  return `${Math.round(n).toLocaleString('es-MX')} PT`
}

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #FFD700, #cc9900)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.34, fontWeight: 800, color: '#07071A', fontFamily: 'DM Sans',
    }}>
      {initials(name)}
    </div>
  )
}

export function Leaderboard() {
  const [users, setUsers] = useState<ApiLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState<typeof PERIODS[number]>('Todos')
  const [sort, setSort] = useState<'pnl' | 'volume'>('pnl')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    usersApi.leaderboard(50, PERIOD_PARAM[period])
      .then(data => { if (active) setUsers(data) })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }  // ignore a stale response if the period changed
  }, [period])

  // Sidebar: top gainers always by P&L
  const topGainers = useMemo(
    () => [...users].sort((a, b) => b.pnl - a.pnl).slice(0, 7),
    [users],
  )

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q ? users.filter(u => u.display_name.toLowerCase().includes(q)) : users
    return [...filtered].sort((a, b) => (sort === 'pnl' ? b.pnl - a.pnl : b.volume - a.volume))
  }, [users, search, sort])

  return (
    <div className="page-container" style={{ maxWidth: 1200, margin: '0 auto', padding: '44px 24px 24px' }}>
      <h1 className="font-display anim-1" style={{ fontSize: 'clamp(1.9rem, 5vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 24px' }}>
        Tabla de clasificación
      </h1>

      {/* Period tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {PERIODS.map(p => {
          const active = p === period
          return (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                background: active ? 'rgba(255,215,0,0.12)' : 'var(--bg-card)',
                border: `1px solid ${active ? 'var(--gold)' : 'var(--border-subtle)'}`,
                borderRadius: 99, padding: '8px 18px',
                fontSize: '0.82rem', fontWeight: 700,
                color: active ? 'var(--gold)' : 'var(--text-tertiary)',
                cursor: 'pointer',
                fontFamily: 'DM Sans', transition: 'all 0.15s',
              }}
            >
              {p}
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', maxWidth: 360,
        background: 'var(--bg-card)', border: '1px solid var(--border-default)',
        borderRadius: 10, overflow: 'hidden', marginBottom: 20,
      }}>
        <span style={{ paddingLeft: 14, color: 'var(--text-tertiary)', display: 'flex' }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre"
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            padding: '11px 12px', fontSize: '0.875rem', color: 'var(--text-primary)', fontFamily: 'DM Sans',
          }}
        />
      </div>

      <div className="leaderboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
        {/* ── Main table ── */}
        <div>
          {/* Column headers (sortable) */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '0 16px 12px', borderBottom: '1px solid var(--border-subtle)',
          }}>
            <span style={{ width: 28, flexShrink: 0 }} />
            <span style={{ flex: 1 }} />
            {([['pnl', 'Ganancia/Pérdida'], ['volume', 'Invertido']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSort(key)}
                style={{
                  width: key === 'pnl' ? 140 : 120, textAlign: 'right',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'DM Sans', fontSize: '0.78rem', fontWeight: 700,
                  color: sort === key ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  paddingBottom: 4,
                  borderBottom: `2px solid ${sort === key ? 'var(--gold)' : 'transparent'}`,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Rows */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 8 }}>
              {[...Array(8)].map((_, i) => (
                <div key={i} style={{ height: 60, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 10, animation: 'livePulse 1.8s ease infinite' }} />
              ))}
            </div>
          ) : error ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)', marginTop: 16 }}>
              No se pudo cargar la clasificación. Intenta más tarde.
            </div>
          ) : rows.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)', marginTop: 16 }}>
              {search ? 'Sin resultados para tu búsqueda.' : 'Aún no hay traders en la clasificación. ¡Sé el primero en operar!'}
            </div>
          ) : (
            <div>
              {rows.map((u, i) => (
                <Link
                  key={u.id}
                  to={`/u/${u.username}`}
                  className="lb-row"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16, textDecoration: 'none',
                    padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <span style={{ width: 28, flexShrink: 0, textAlign: 'center', fontSize: i < 3 && sort === 'pnl' ? '1.2rem' : '0.9rem' }}>
                    {i < 3 && sort === 'pnl'
                      ? MEDAL[i]
                      : <span className="font-mono" style={{ fontWeight: 800, color: 'var(--text-tertiary)' }}>{i + 1}</span>}
                  </span>
                  <Avatar name={u.display_name} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.display_name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                      {u.accuracy}% precisión · {u.markets_traded} mercados
                    </div>
                  </div>
                  <span className="font-mono lb-pnl" style={{ width: 140, textAlign: 'right', fontSize: '0.95rem', fontWeight: 800, color: u.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {fmtPnl(u.pnl)}
                  </span>
                  <span className="font-mono lb-vol" style={{ width: 120, textAlign: 'right', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {fmtVol(u.volume)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Sidebar: top gainers ── */}
        <div className="leaderboard-side">
          <div className="card" style={{ padding: '20px 18px' }}>
            <div className="exchange-header" style={{ marginBottom: 16 }}>Mayores ganancias</div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} style={{ height: 40, background: 'var(--bg-surface)', borderRadius: 8, animation: 'livePulse 1.8s ease infinite' }} />
                ))}
              </div>
            ) : topGainers.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', margin: 0 }}>Aún no hay datos.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {topGainers.map((u, i) => (
                  <div key={u.id} style={{
                    display: 'flex', alignItems: 'center', gap: 11,
                    padding: '10px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)',
                  }}>
                    <span className="font-mono" style={{ width: 14, fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-tertiary)', flexShrink: 0 }}>{i + 1}</span>
                    <Avatar name={u.display_name} size={30} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.display_name}
                    </span>
                    <span className="font-mono" style={{ fontSize: '0.82rem', fontWeight: 800, color: u.pnl >= 0 ? 'var(--green)' : 'var(--red)', flexShrink: 0 }}>
                      {fmtPnl(u.pnl)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
