import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usersApi, type ApiLeaderboardEntry, type ApiLeaderboardGanadores, type ApiLeaderboardMes, type LeaderboardPeriod } from '../lib/api'
import { useAuth } from '../lib/AuthContext'
import { formatPnl, formatNum } from '../lib/format'
import { Avatar } from '../components/Avatar'
import { Tabs } from '../components/Tabs'
import { Icon } from '../components/Icon'

const PERIODS = ['Hoy', 'Semanal', 'Mensual', 'Todos'] as const
const PERIOD_PARAM: Record<typeof PERIODS[number], LeaderboardPeriod> = {
  Hoy: 'today', Semanal: 'week', Mensual: 'month', Todos: 'all',
}

export function Leaderboard() {
  const { t, i18n } = useTranslation()
  const periodLabels: Record<typeof PERIODS[number], string> = {
    Hoy: t('leaderboard.periodToday'),
    Semanal: t('leaderboard.periodWeek'),
    Mensual: t('leaderboard.periodMonth'),
    Todos: t('leaderboard.periodAll'),
  }
  const [users, setUsers] = useState<ApiLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState<typeof PERIODS[number]>('Mensual')
  const { user } = useAuth()
  const [mes, setMes] = useState<ApiLeaderboardMes | null>(null)
  const [ganadores, setGanadores] = useState<ApiLeaderboardGanadores[]>([])
  const monthly = period === 'Mensual'
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

  useEffect(() => {
    usersApi.leaderboardMes().then(setMes).catch(() => setMes(null))
  }, [user?.id])

  useEffect(() => {
    usersApi.leaderboardGanadores().then(setGanadores).catch(() => {})
  }, [])

  // Sidebar: top gainers always by P&L
  // En «Este mes» solo los que califican (el admin y los que no llegan al mínimo, fuera).
  const topGainers = useMemo(
    () => users.filter(u => !monthly || u.elegible).sort((a, b) => b.pnl - a.pnl).slice(0, 7),
    [users, monthly],
  )

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q ? users.filter(u => u.display_name.toLowerCase().includes(q)) : users
    // Mensual por ganancia: el orden del servidor (elegibles por lugar, luego el resto).
    if (monthly && sort === 'pnl') return filtered
    return [...filtered].sort((a, b) => (sort === 'pnl' ? b.pnl - a.pnl : b.volume - a.volume))
  }, [users, search, sort, monthly])

  return (
    <div className="page-container" style={{ paddingTop: 44, paddingBottom: 24 }}>
      <h1 className="anim-1" style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em', margin: '0 0 16px' }}>
        {t('leaderboard.title')}
      </h1>

      {monthly && mes && <MonthlyCard mes={mes} />}

      {/* Period tabs + search */}
      <div className="tabs-line" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Tabs<typeof PERIODS[number]>
          items={PERIODS.map(p => ({ key: p, label: periodLabels[p] }))}
          active={period}
          onChange={setPeriod}
        />
        <div className="input" style={{ display: 'flex', alignItems: 'center', gap: 8, width: 280, maxWidth: '100%', height: 36, padding: '0 10px', marginBottom: 8 }}>
          <Icon name="search" size={15} style={{ color: 'var(--text-tertiary)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('leaderboard.searchPlaceholder')}
            style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text-primary)', fontFamily: 'inherit' }}
          />
        </div>
      </div>

      <div className="leaderboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
        {/* ── Main table ── */}
        <div style={{ minWidth: 0 }}>
          {/* Column headers (sortable) */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '0 8px 8px', borderBottom: '1px solid var(--border-subtle)',
          }}>
            <span style={{ width: 28, flexShrink: 0 }} />
            <span style={{ flex: 1 }} />
            {([['pnl', t('leaderboard.colPnl')], ['volume', t('leaderboard.colVolume')]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSort(key)}
                className={key === 'volume' ? 'lb-vol' : 'lb-pnl'}
                style={{
                  width: key === 'pnl' ? 140 : 120, textAlign: 'right',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
                  color: sort === key ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  display: 'inline-flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, padding: 0,
                }}
              >
                {label}
                {sort === key && <Icon name="chevron-down" size={12} />}
              </button>
            ))}
          </div>

          {/* Rows */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 8 }}>
              {[...Array(8)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 60, borderRadius: 10 }} />
              ))}
            </div>
          ) : error ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)', marginTop: 16 }}>
              {t('leaderboard.loadError')}
            </div>
          ) : rows.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)', marginTop: 16 }}>
              {search ? t('leaderboard.emptySearch') : t('leaderboard.emptyNoTraders')}
            </div>
          ) : (
            <div>
              {rows.map((u, i) => {
                const rank = monthly ? u.rank ?? null : i + 1
                const ineligible = monthly && !u.elegible
                return (
                <Link
                  key={u.id}
                  to={`/u/${u.username}`}
                  className="list-row is-link lb-row"
                  style={{ gap: 16, padding: '12px 8px' }}
                >
                  <span className="num" style={{ width: 28, flexShrink: 0, textAlign: 'center', fontSize: 13, fontWeight: rank && rank <= 3 ? 600 : 500, color: rank && rank <= 3 ? 'var(--text-primary)' : 'var(--text-tertiary)', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                    {rank === null ? '—'
                      : rank <= 3 && sort === 'pnl' && (monthly || rank === 1)
                        ? <><Icon name="medal" size={16} style={{ color: rank === 1 ? 'var(--accent)' : 'var(--text-secondary)' }} />{monthly && rank > 1 ? rank : null}</>
                        : rank}
                  </span>
                  <Avatar name={u.display_name} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.display_name}
                    </div>
                    <div className="meta-label num">
                      {ineligible
                        ? t('leaderboard.monthly.notEligible', { count: u.markets_traded })
                        : monthly
                          ? t('leaderboard.monthly.statLine', { count: u.markets_traded })
                          : t('leaderboard.statLine', { accuracy: u.accuracy, count: u.markets_traded })}
                    </div>
                  </div>
                  <span className="num lb-pnl" style={{ width: 140, textAlign: 'right', fontSize: 14, fontWeight: 600, color: u.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {formatPnl(u.pnl)}
                  </span>
                  <span className="num lb-vol" style={{ width: 120, textAlign: 'right', fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {`${formatNum(u.volume)} PT`}
                  </span>
                </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Sidebar: top gainers ── */}
        <div className="leaderboard-side">
          <div className="card" style={{ padding: '16px 16px 8px' }}>
            <h3 className="section-title" style={{ fontSize: 16, marginBottom: 6 }}>{t('leaderboard.topGainers')}</h3>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 40, borderRadius: 8, background: 'var(--bg-surface)', border: 'none' }} />
                ))}
              </div>
            ) : topGainers.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', margin: 0 }}>{t('leaderboard.noData')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {topGainers.map((u, i) => (
                  <Link key={u.id} to={`/u/${u.username}`} className="list-row is-link" style={{ gap: 10, padding: '10px 4px' }}>
                    <span className="num" style={{ width: 14, fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', flexShrink: 0 }}>{i + 1}</span>
                    <Avatar name={u.display_name} size={28} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.display_name}
                    </span>
                    <span className="num" style={{ fontSize: 13, fontWeight: 600, color: u.pnl >= 0 ? 'var(--green)' : 'var(--red)', flexShrink: 0 }}>
                      {formatPnl(u.pnl)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {ganadores.length > 0 && (
            <div className="card" style={{ padding: '16px 16px 8px', marginTop: 16 }}>
              <h3 className="section-title" style={{ fontSize: 16, marginBottom: 6 }}>{t('leaderboard.monthly.pastWinners')}</h3>
              {ganadores.map(g => (
                <div key={g.mes} style={{ padding: '6px 0' }}>
                  <div className="meta-label">{monthName(g.mes, i18n.language)}</div>
                  {g.ganadores.map(w => (
                    <Link key={w.username} to={`/u/${w.username}`} className="list-row is-link" style={{ gap: 10, padding: '8px 4px' }}>
                      <span className="num" style={{ width: 14, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', flexShrink: 0 }}>{w.rank}</span>
                      <Avatar name={w.display_name} size={28} />
                      <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {w.display_name}
                      </span>
                      <span className="num" style={{ fontSize: 13, fontWeight: 600, color: w.ganancia >= 0 ? 'var(--green)' : 'var(--red)', flexShrink: 0 }}>
                        {formatPnl(w.ganancia)}
                      </span>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** 'YYYY-MM' → «octubre 2026» en el idioma activo. */
function monthName(mes: string, lang?: string): string {
  const [y, m] = mes.split('-').map(Number)
  const s = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString(lang, { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Premios del mes, cierre y lo que me falta para calificar. */
function MonthlyCard({ mes }: { mes: ApiLeaderboardMes }) {
  const { t, i18n } = useTranslation()
  const ms = Math.max(0, new Date(mes.termina_at).getTime() - Date.now())
  const days = Math.floor(ms / 86_400_000)
  const hours = Math.floor((ms % 86_400_000) / 3_600_000)
  const yo = mes.yo
  const preview = mes.mes < '2026-10'  // los premios empiezan en octubre 2026 (espejo del backend)
  return (
    <div className="card anim-1" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <Icon name="trophy" size={28} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
      <div style={{ flex: '1 1 260px', minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
          {preview ? t('leaderboard.monthly.previewTitle') : t('leaderboard.monthly.title', { month: monthName(mes.mes, i18n.language) })}
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          {t('leaderboard.monthly.prizes', { count: mes.premiados })}{' '}
          {t('leaderboard.monthly.rules', { trades: mes.min_predicciones, markets: mes.min_mercados })}
        </div>
        <div className="meta-label num" style={{ marginTop: 6 }}>
          {t('leaderboard.monthly.closesIn', { days, hours })}
          {yo && ' · '}
          {yo && (yo.elegible
            ? t('leaderboard.monthly.yourRank', { rank: yo.rank, pnl: formatPnl(yo.ganancia) })
            : t('leaderboard.monthly.missing', { trades: yo.faltan_predicciones, markets: yo.faltan_mercados }))}
        </div>
      </div>
      <Link to="/mercados" className="btn btn-primary" style={{ flexShrink: 0 }}>{t('leaderboard.monthly.cta')}</Link>
    </div>
  )
}
