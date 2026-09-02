import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usersApi, type ApiFollowedUser, type ApiFeedTrade } from '../lib/api'
import { useAuth } from '../lib/AuthContext'
import { track } from '../lib/analytics'
import { formatPnl, formatNum, timeAgo } from '../lib/format'
import { Avatar } from '../components/Avatar'
import { Tabs } from '../components/Tabs'

const TABS = ['Actividad', 'Usuarios'] as const

function positionTag(p: { side: string | null; outcome_key: string | null }, yesLabel: string, noLabel: string) {
  if (p.side === 'YES') return yesLabel
  if (p.side === 'NO') return noLabel
  return p.outcome_key ?? ''
}
function sideColor(side: string | null) {
  if (side === 'YES') return 'var(--green)'
  if (side === 'NO') return 'var(--red)'
  return 'var(--text-primary)'
}

function tradeTag(t: ApiFeedTrade, yesLabel: string, noLabel: string) {
  if (t.side === 'YES') return yesLabel
  if (t.side === 'NO') return noLabel
  return t.outcome_label ?? t.outcome_key ?? ''
}
function tradeColor(t: ApiFeedTrade) {
  return sideColor(t.side)
}
// price_after is the YES price for binary markets; a NO buyer paid the complement.
function tradePrice(t: ApiFeedTrade) {
  return t.side === 'NO' ? 100 - t.price_after : t.price_after
}

export function Following() {
  const { t } = useTranslation()
  const { user, loading: authLoading } = useAuth()
  const [tab, setTab] = useState<typeof TABS[number]>('Actividad')
  const [users, setUsers] = useState<ApiFollowedUser[]>([])
  const [feed, setFeed] = useState<ApiFeedTrade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) { setLoading(false); return }
    let active = true
    setLoading(true)
    Promise.all([usersApi.following(), usersApi.feed()])
      .then(([f, t]) => { if (active) { setUsers(f); setFeed(t) } })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user?.id, authLoading])

  async function unfollow(u: ApiFollowedUser) {
    setUsers(prev => prev.filter(x => x.id !== u.id))  // optimistic
    setFeed(prev => prev.filter(t => t.username !== u.username))
    try {
      await usersApi.unfollow(u.username)
      track('Unfollow', { username: u.username, context: 'following_page' })
    } catch {
      setUsers(prev => [u, ...prev])  // revert
    }
  }

  if (authLoading || loading) {
    return (
      <div className="page-container" style={{ maxWidth: 820, margin: '0 auto', padding: '48px 24px' }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 100, marginBottom: 12 }} />
        ))}
      </div>
    )
  }

  if (!user) {
    return (
      <div className="page-container" style={{ maxWidth: 820, margin: '0 auto', padding: '100px 24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>{t('following.loginPrompt')}</p>
        <Link to="/" className="btn btn-secondary">
          {t('following.backHome')}
        </Link>
      </div>
    )
  }

  const emptyState = (
    <div className="card" style={{ padding: 40, textAlign: 'center' }}>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 14px' }}>{t('following.emptyFollow')}</p>
      <Link to="/clasificacion" className="btn btn-secondary">
        {t('following.seeLeaderboard')}
      </Link>
    </div>
  )

  return (
    <div className="page-container" style={{ maxWidth: 820, margin: '0 auto', padding: '44px 24px 24px' }}>
      <h1 className="anim-1" style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em', margin: '0 0 16px' }}>
        {t('following.title')}
      </h1>

      {/* Tabs */}
      <div className="tabs-line" style={{ marginBottom: 16 }}>
        <Tabs<typeof TABS[number]>
          items={TABS.map(t2 => ({ key: t2, label: t2 === 'Actividad' ? t('following.tabActivity') : t('following.tabUsers') }))}
          active={tab}
          onChange={setTab}
        />
      </div>

      {error ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
          {t('following.loadError')}
        </div>
      ) : users.length === 0 ? (
        emptyState
      ) : tab === 'Actividad' ? (
        /* ── Activity feed ── */
        feed.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            {t('following.noActivity')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {feed.map(tr => (
              <div key={tr.id} className="list-row" style={{ gap: 14, padding: '14px 0', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <Link to={`/u/${tr.username}`} style={{ flexShrink: 0 }}>
                  <Avatar name={tr.display_name} url={tr.avatar_url} size={36} />
                </Link>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <Link to={`/u/${tr.username}`} style={{ color: 'var(--text-primary)', fontWeight: 600, textDecoration: 'none' }}>
                      {tr.display_name}
                    </Link>
                    {' '}{t('following.bought')}{' '}
                    <span style={{ color: tradeColor(tr), fontWeight: 600 }}>{tradeTag(tr, t('common.yes'), t('common.no'))}</span>
                    {' '}{t('following.atPrice')} <span className="num" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{Math.round(tradePrice(tr))}%</span> {t('following.inMarket')}{' '}
                    <Link to={`/mercado/${tr.market_id}`} style={{ color: 'var(--text-primary)', fontWeight: 500, textDecoration: 'none' }}>
                      {tr.market_question}
                    </Link>
                  </div>
                  <div className="meta-label num" style={{ marginTop: 3 }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{formatNum(tr.cost)} PT</span>
                    {' · '}{timeAgo(tr.created_at)}
                  </div>
                </div>
                {tr.market_status === 'open' && (
                  <Link
                    to={`/mercado/${tr.market_id}?${new URLSearchParams({
                      ...(tr.side ? { side: tr.side } : {}),
                      ...(tr.outcome_key && tr.market_type === 'multi' ? { outcome: tr.outcome_key } : {}),
                      monto: String(Math.max(1, Math.round(tr.cost))),
                    })}`}
                    onClick={() => track('CopyTrade', { market: tr.market_id, from: tr.username })}
                    className="btn btn-secondary btn-sm"
                    style={{ flexShrink: 0 }}
                  >
                    {t('following.copyTrade')}
                  </Link>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        /* ── Followed users list ── */
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {users.map(u => (
            <div key={u.id} className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8, padding: '16px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <Link to={`/u/${u.username}`} style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', flex: 1, minWidth: 200 }}>
                  <Avatar name={u.display_name} url={u.avatar_url} size={40} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.display_name}
                    </div>
                    <div className="meta-label">@{u.username}</div>
                  </div>
                </Link>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div className="num" style={{ fontSize: 14, fontWeight: 600, color: u.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatPnl(u.pnl)}</div>
                    <div className="meta-label">{t('following.pnlLabel')}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="num" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{formatNum(u.points)} PT</div>
                    <div className="meta-label">{t('following.balanceLabel')}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="num" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>{formatNum(u.volume)} PT</div>
                    <div className="meta-label">{t('following.investedLabel')}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="num" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>{u.accuracy}%</div>
                    <div className="meta-label">{t('following.precisionLabel')}</div>
                  </div>
                  <button onClick={() => unfollow(u)} className="btn btn-secondary btn-sm">
                    {t('following.followingBtn')}
                  </button>
                </div>
              </div>
              <div className="meta-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {u.positions_count === 0
                  ? t('following.noPositionsShort')
                  : <>
                      {t('following.positions', { count: u.positions_count })} —{' '}
                      {u.top_positions.map((p, i) => (
                        <span key={p.id}>
                          {i > 0 && ' · '}
                          <span style={{ color: sideColor(p.side), fontWeight: 600 }}>
                            {positionTag(p, t('common.yes'), t('common.no'))}
                          </span>{' '}
                          {p.market_question}
                        </span>
                      ))}
                    </>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
