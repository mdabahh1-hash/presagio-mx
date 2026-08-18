import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usersApi, type ApiProfilePublic, type ApiPosition } from '../lib/api'
import { useAuth } from '../lib/AuthContext'
import { AuthModal } from '../components/AuthModal'
import { track } from '../lib/analytics'
import { formatPnl, formatNum, formatDate } from '../lib/format'

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

export function PublicProfile() {
  const { t } = useTranslation()
  const { username } = useParams<{ username: string }>()
  const { user } = useAuth()
  const [profile, setProfile] = useState<ApiProfilePublic | null>(null)
  const [positions, setPositions] = useState<ApiPosition[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followBusy, setFollowBusy] = useState(false)
  const [authModal, setAuthModal] = useState(false)

  useEffect(() => {
    if (!username) return
    setLoading(true)
    setNotFound(false)
    usersApi.get(username)
      .then(p => {
        setProfile(p)
        setIsFollowing(p.is_following === true)
        setFollowersCount(p.followers_count)
        return usersApi.publicPositions(username).then(setPositions).catch(() => {})
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [username, user?.id])

  async function toggleFollow() {
    if (!profile || followBusy) return
    if (!user) { setAuthModal(true); return }
    const wasFollowing = isFollowing
    setFollowBusy(true)
    setIsFollowing(!wasFollowing)
    setFollowersCount(c => c + (wasFollowing ? -1 : 1))
    try {
      const res = wasFollowing
        ? await usersApi.unfollow(profile.username)
        : await usersApi.follow(profile.username)
      setIsFollowing(res.following)
      setFollowersCount(res.followers_count)
      track(wasFollowing ? 'Unfollow' : 'Follow', { username: profile.username })
    } catch {
      // Revert optimistic update on error
      setIsFollowing(wasFollowing)
      setFollowersCount(c => c + (wasFollowing ? 1 : -1))
    } finally {
      setFollowBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="page-container" style={{ maxWidth: 820, margin: '0 auto', padding: '48px 24px' }}>
        <div className="card" style={{ height: 140, animation: 'livePulse 1.8s ease infinite', marginBottom: 16 }} />
        <div className="card" style={{ height: 220, animation: 'livePulse 1.8s ease infinite' }} />
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="page-container" style={{ maxWidth: 820, margin: '0 auto', padding: '100px 24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>{t('publicProfile.notFound')}</p>
        <Link to="/clasificacion" style={{ color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}>
          {t('publicProfile.seeLeaderboard')}
        </Link>
      </div>
    )
  }

  const isOwnProfile = user?.username === profile.username
  const memberSince = formatDate(profile.created_at, { month: 'long', year: 'numeric' })
  const followersLabel = t('publicProfile.followers', { count: followersCount })
  const stats = [
    { label: t('publicProfile.pnl'), value: formatPnl(profile.pnl), color: profile.pnl >= 0 ? 'var(--green)' : 'var(--red)' },
    { label: t('publicProfile.precision'), value: `${profile.accuracy}%`, color: 'var(--text-primary)' },
    { label: t('publicProfile.markets'), value: formatNum(profile.markets_traded), color: 'var(--text-primary)' },
    { label: t('publicProfile.invested'), value: `${formatNum(profile.volume)} PT`, color: 'var(--gold)' },
  ]

  return (
    <div className="page-container" style={{ maxWidth: 820, margin: '0 auto', padding: '40px 24px 24px' }}>
      {/* Header */}
      <div className="anim-1 card" style={{ padding: '28px 30px', marginBottom: 16, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.display_name} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--oro-glow)' }} />
        ) : (
          <div style={{
            width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--oro-fill), var(--oro-fill-2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', fontWeight: 800, color: '#07071A', fontFamily: 'DM Sans',
          }}>{initials(profile.display_name)}</div>
        )}
        <div>
          <h1 className="font-display" style={{ fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 4px' }}>
            {profile.display_name}
          </h1>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>{t('publicProfile.memberSince', { date: memberSince })}</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
            {followersLabel} · {t('publicProfile.followsCount', { count: profile.following_count })}
          </div>
        </div>
        {!isOwnProfile && (
          <button
            onClick={toggleFollow}
            disabled={followBusy}
            style={isFollowing ? {
              marginLeft: 'auto', flexShrink: 0, cursor: 'pointer',
              background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: 10, padding: '9px 18px', fontSize: '0.85rem', fontWeight: 700,
              opacity: followBusy ? 0.6 : 1,
            } : {
              marginLeft: 'auto', flexShrink: 0, cursor: 'pointer',
              background: 'linear-gradient(135deg, var(--oro-fill), var(--oro-fill-2))', color: '#07071A',
              border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: '0.85rem', fontWeight: 800,
              opacity: followBusy ? 0.6 : 1,
            }}
          >
            {isFollowing ? t('publicProfile.followingBtn') : t('publicProfile.follow')}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="market-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} className="stat-card card" style={{ padding: '18px 16px', textAlign: 'center' }}>
            <div className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', marginTop: 6, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Open positions */}
      <div className="exchange-header" style={{ marginBottom: 14 }}>{t('publicProfile.openPositions')}</div>
      {positions.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>
          {t('publicProfile.noOpenPositions')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {positions.map(p => {
            // Binary markets have side YES/NO; multi-outcome markets have side
            // null and the outcome label in outcome_key.
            const isBinary = p.side === 'YES' || p.side === 'NO'
            const label = isBinary ? (p.side === 'YES' ? t('common.yes') : t('common.no')) : (p.outcome_key ?? '—')
            const color = isBinary ? (p.side === 'YES' ? 'var(--green)' : 'var(--red)') : 'var(--blue)'
            const bg = p.side === 'YES' ? 'var(--green-soft)' : p.side === 'NO' ? 'var(--red-soft)' : 'var(--accent-alt-bg)'
            const invested = p.avg_cost * p.shares
            return (
              <Link key={p.id} to={`/mercado/${p.market_id}`} className="lb-row card" style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', textDecoration: 'none',
              }}>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 800, color, flexShrink: 0,
                  background: bg,
                  border: `1px solid ${color}`, borderRadius: 8, padding: '4px 10px',
                  maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{label}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.market_question}
                </span>
                <span className="font-mono" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', flexShrink: 0 }}>
                  {formatNum(invested)} PT
                </span>
              </Link>
            )
          })}
        </div>
      )}

      {authModal && <AuthModal initialMode="login" onClose={() => setAuthModal(false)} />}
    </div>
  )
}
