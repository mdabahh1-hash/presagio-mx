import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usersApi, type ApiFollowedUser, type ApiFeedTrade } from '../lib/api'
import { useAuth } from '../lib/AuthContext'
import { track } from '../lib/analytics'
import { formatPnl, formatNum, timeAgo } from '../lib/format'

const TABS = ['Actividad', 'Usuarios'] as const

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

function Avatar({ name, url, size = 48 }: { name: string; url?: string | null; size?: number }) {
  if (url) {
    return <img src={url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--oro-glow)' }} />
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, var(--oro-fill), var(--oro-fill-2))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.34, fontWeight: 700, color: '#07071A',
    }}>
      {initials(name)}
    </div>
  )
}

function positionTag(p: { side: string | null; outcome_key: string | null }, yesLabel: string, noLabel: string) {
  if (p.side === 'YES') return yesLabel
  if (p.side === 'NO') return noLabel
  return p.outcome_key ?? ''
}

function tradeTag(t: ApiFeedTrade, yesLabel: string, noLabel: string) {
  if (t.side === 'YES') return yesLabel
  if (t.side === 'NO') return noLabel
  return t.outcome_label ?? t.outcome_key ?? ''
}
function tradeColor(t: ApiFeedTrade) {
  if (t.side === 'YES') return 'var(--green)'
  if (t.side === 'NO') return 'var(--red)'
  return 'var(--blue)'
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
        <Link to="/" style={{ color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}>
          {t('following.backHome')}
        </Link>
      </div>
    )
  }

  const emptyState = (
    <div className="card" style={{ padding: 40, textAlign: 'center' }}>
      <p style={{ color: 'var(--text-secondary)', margin: '0 0 14px' }}>{t('following.emptyFollow')}</p>
      <Link to="/clasificacion" style={{ color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}>
        {t('following.seeLeaderboard')}
      </Link>
    </div>
  )

  return (
    <div className="page-container" style={{ maxWidth: 820, margin: '0 auto', padding: '44px 24px 24px' }}>
      <h1 className="font-display anim-1" style={{ fontSize: 'clamp(1.9rem, 5vw, 2.6rem)', fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 24px' }}>
        {t('following.title')}
      </h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(t2 => {
          const active = t2 === tab
          return (
            <button
              key={t2}
              onClick={() => setTab(t2)}
              style={{
                background: active ? 'var(--oro-dim)' : 'var(--bg-card)',
                border: `1px solid ${active ? 'var(--gold)' : 'var(--border-subtle)'}`,
                borderRadius: 99, padding: '8px 18px',
                fontSize: '0.82rem', fontWeight: 700,
                color: active ? 'var(--gold)' : 'var(--text-tertiary)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {t2 === 'Actividad' ? t('following.tabActivity') : t('following.tabUsers')}
            </button>
          )
        })}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {feed.map(tr => (
              <div key={tr.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', flexWrap: 'wrap' }}>
                <Link to={`/u/${tr.username}`} style={{ flexShrink: 0 }}>
                  <Avatar name={tr.display_name} url={tr.avatar_url} size={40} />
                </Link>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <Link to={`/u/${tr.username}`} style={{ color: 'var(--text-primary)', fontWeight: 700, textDecoration: 'none' }}>
                      {tr.display_name}
                    </Link>
                    {' '}{t('following.bought')}{' '}
                    <span style={{ color: tradeColor(tr), fontWeight: 700 }}>{tradeTag(tr, t('common.yes'), t('common.no'))}</span>
                    {' '}{t('following.atPrice')} <span className="font-mono" style={{ fontWeight: 700 }}>{Math.round(tradePrice(tr))}%</span> {t('following.inMarket')}{' '}
                    <Link to={`/mercado/${tr.market_id}`} style={{ color: 'var(--text-primary)', fontWeight: 600, textDecoration: 'none' }}>
                      {tr.market_question}
                    </Link>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 3 }}>
                    <span className="font-mono" style={{ color: 'var(--gold)', fontWeight: 700 }}>{formatNum(tr.cost)} PT</span>
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
                    style={{
                      flexShrink: 0, textDecoration: 'none',
                      background: 'linear-gradient(135deg, var(--oro-fill), var(--oro-fill-2))', color: '#07071A',
                      borderRadius: 10, padding: '9px 16px', fontSize: '0.78rem', fontWeight: 700,
                    }}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {users.map(u => (
            <div key={u.id} className="card" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <Link to={`/u/${u.username}`} style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', flex: 1, minWidth: 200 }}>
                  <Avatar name={u.display_name} url={u.avatar_url} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.display_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>@{u.username}</div>
                  </div>
                </Link>
                <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div className="font-mono" style={{ fontSize: '0.92rem', fontWeight: 700, color: u.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatPnl(u.pnl)}</div>
                    <div className="meta-label">{t('following.pnlLabel')}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="font-mono" style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--gold)' }}>{formatNum(u.points)} PT</div>
                    <div className="meta-label">{t('following.balanceLabel')}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="font-mono" style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{formatNum(u.volume)} PT</div>
                    <div className="meta-label">{t('following.investedLabel')}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="font-mono" style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{u.accuracy}%</div>
                    <div className="meta-label">{t('following.precisionLabel')}</div>
                  </div>
                  <button
                    onClick={() => unfollow(u)}
                    style={{
                      cursor: 'pointer', background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
                      border: '1px solid var(--border-default)', borderRadius: 10,
                      padding: '8px 14px', fontSize: '0.78rem', fontWeight: 700,
                    }}
                  >
                    {t('following.followingBtn')}
                  </button>
                </div>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {u.positions_count === 0
                  ? t('following.noPositionsShort')
                  : <>
                      {t('following.positions', { count: u.positions_count })} —{' '}
                      {u.top_positions.map((p, i) => (
                        <span key={p.id}>
                          {i > 0 && ' · '}
                          <span style={{ color: p.side === 'YES' ? 'var(--green)' : p.side === 'NO' ? 'var(--red)' : 'var(--blue)', fontWeight: 700 }}>
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
