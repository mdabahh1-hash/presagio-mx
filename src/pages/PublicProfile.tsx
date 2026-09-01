import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usersApi, type ApiProfilePublic, type ApiPosition, type ApiHistoryEvent } from '../lib/api'
import { useAuth } from '../lib/AuthContext'
import { AuthModal } from '../components/AuthModal'
import { HistoryList } from '../components/HistoryList'
import { ProfileHeaderCard } from '../components/profile/ProfileHeaderCard'
import { PnlChartCard } from '../components/profile/PnlChartCard'
import { PositionsTable } from '../components/profile/PositionsTable'
import { CategoryBar } from '../components/CategoryBar'
import { track } from '../lib/analytics'
import { formatNum } from '../lib/format'

export function PublicProfile() {
  const { t } = useTranslation()
  const { username } = useParams<{ username: string }>()
  const { user } = useAuth()
  const [profile, setProfile] = useState<ApiProfilePublic | null>(null)
  const [positions, setPositions] = useState<ApiPosition[]>([])
  const [history, setHistory] = useState<ApiHistoryEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followBusy, setFollowBusy] = useState(false)
  const [authModal, setAuthModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'posiciones' | 'actividad'>('posiciones')

  useEffect(() => {
    if (!username) return
    setLoading(true)
    setNotFound(false)
    usersApi.get(username)
      .then(p => {
        setProfile(p)
        setIsFollowing(p.is_following === true)
        setFollowersCount(p.followers_count)
        usersApi.publicHistory(username).then(setHistory).catch(() => {})
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
      <div className="page-container" style={{ paddingTop: 20, paddingBottom: 24 }}>
        <CategoryBar />
        <div className="profile-top-grid">
          <div className="card" style={{ height: 260, animation: 'livePulse 1.8s ease infinite' }} />
          <div className="card" style={{ height: 260, animation: 'livePulse 1.8s ease infinite' }} />
        </div>
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="page-container" style={{ paddingTop: 20, paddingBottom: 100 }}>
        <CategoryBar />
        <div style={{ paddingTop: 80, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>{t('publicProfile.notFound')}</p>
        <Link to="/clasificacion" style={{ color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}>
          {t('publicProfile.seeLeaderboard')}
        </Link>
        </div>
      </div>
    )
  }

  const isOwnProfile = user?.username === profile.username
  const positionsValue = positions.reduce((s, p) => s + (p.current_value ?? p.avg_cost * p.shares), 0)
  const wins = history.filter(e => e.type === 'win')
  const biggestWin = wins.length ? Math.max(...wins.map(e => e.amount)) : null

  return (
    <div className="page-container" style={{ paddingTop: 20, paddingBottom: 24 }}>
      <CategoryBar />
      {/* Fila superior: perfil + P&L (sin chart — el ledger ajeno es privado) */}
      <div className="anim-1 profile-top-grid">
        <ProfileHeaderCard
          variant="public"
          displayName={profile.display_name}
          username={profile.username}
          avatarUrl={profile.avatar_url}
          createdAt={profile.created_at}
          positionsValue={positionsValue}
          biggestWin={biggestWin}
          predictions={profile.markets_traded}
          followersCount={followersCount}
          followingCount={profile.following_count}
          isFollowing={isFollowing}
          followBusy={followBusy}
          onToggleFollow={toggleFollow}
          showFollow={!isOwnProfile}
        />
        <PnlChartCard
          pnl={profile.pnl}
          subStats={[
            { label: t('publicProfile.precision'), value: `${profile.accuracy}%` },
            { label: t('publicProfile.markets'), value: formatNum(profile.markets_traded) },
            { label: t('publicProfile.invested'), value: `${formatNum(profile.volume)} PT`, color: 'var(--gold)' },
          ]}
        />
      </div>

      {/* Tabs */}
      <div className="anim-2" style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border-subtle)' }}>
        {(['posiciones', 'actividad'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: 'transparent', border: 'none',
              borderBottom: `2px solid ${activeTab === tab ? 'var(--blue)' : 'transparent'}`,
              padding: '10px 18px',
              fontSize: '0.85rem', fontWeight: 700,
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer', fontFamily: 'DM Sans',
              letterSpacing: '0.05em', textTransform: 'capitalize',
              transition: 'color 0.15s', marginBottom: -1,
            }}
          >
            {tab === 'posiciones' ? t('profile.tabPositions') : t('profile.tabActivity')}
          </button>
        ))}
      </div>

      {activeTab === 'posiciones' && (
        <div className="anim-3">
          <PositionsTable positions={positions} history={history} />
        </div>
      )}

      {activeTab === 'actividad' && (
        <div className="anim-3">
          <HistoryList events={history} variant="public" />
        </div>
      )}

      {authModal && <AuthModal initialMode="login" onClose={() => setAuthModal(false)} />}
    </div>
  )
}
