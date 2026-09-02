import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usersApi, type ApiLeaderboardEntry, type LeaderboardPeriod } from '../lib/api'
import { formatPnl, formatNum } from '../lib/format'
import { Avatar } from '../components/Avatar'
import { Tabs } from '../components/Tabs'
import { Icon } from '../components/Icon'

const PERIODS = ['Hoy', 'Semanal', 'Mensual', 'Todos'] as const
const PERIOD_PARAM: Record<typeof PERIODS[number], LeaderboardPeriod> = {
  Hoy: 'today', Semanal: 'week', Mensual: 'month', Todos: 'all',
}

export function Leaderboard() {
  const { t } = useTranslation()
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
    <div className="page-container" style={{ paddingTop: 44, paddingBottom: 24 }}>
      <h1 className="anim-1" style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em', margin: '0 0 16px' }}>
        {t('leaderboard.title')}
      </h1>

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
        <div>
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
              {rows.map((u, i) => (
                <Link
                  key={u.id}
                  to={`/u/${u.username}`}
                  className="list-row is-link lb-row"
                  style={{ gap: 16, padding: '12px 8px' }}
                >
                  <span className="num" style={{ width: 28, flexShrink: 0, textAlign: 'center', fontSize: 13, fontWeight: i < 3 ? 600 : 500, color: i < 3 ? 'var(--text-primary)' : 'var(--text-tertiary)', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: 2 }}>
                    {i === 0 && sort === 'pnl' ? <Icon name="medal" size={16} style={{ color: 'var(--accent)' }} /> : i + 1}
                  </span>
                  <Avatar name={u.display_name} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.display_name}
                    </div>
                    <div className="meta-label num">
                      {t('leaderboard.statLine', { accuracy: u.accuracy, markets: u.markets_traded })}
                    </div>
                  </div>
                  <span className="num lb-pnl" style={{ width: 140, textAlign: 'right', fontSize: 14, fontWeight: 600, color: u.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {formatPnl(u.pnl)}
                  </span>
                  <span className="num lb-vol" style={{ width: 120, textAlign: 'right', fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>
                    {`${formatNum(u.volume)} PT`}
                  </span>
                </Link>
              ))}
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
        </div>
      </div>
    </div>
  )
}
