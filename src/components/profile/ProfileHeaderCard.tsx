import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatNum, formatDate } from '../../lib/format'
import { Avatar } from '../Avatar'
import { Icon } from '../Icon'

interface Props {
  displayName: string
  username: string
  avatarUrl: string | null
  createdAt: string
  positionsValue: number
  biggestWin: number | null
  predictions: number
  variant: 'own' | 'public'
  // own
  balance?: number
  onOpenSettings?: () => void
  // public
  followersCount?: number
  followingCount?: number
  isFollowing?: boolean
  followBusy?: boolean
  onToggleFollow?: () => void
  showFollow?: boolean
}

export function ProfileHeaderCard({
  displayName, username, avatarUrl, createdAt,
  positionsValue, biggestWin, predictions, variant,
  balance, onOpenSettings,
  followersCount, followingCount, isFollowing, followBusy, onToggleFollow, showFollow,
}: Props) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const share = () => {
    const url = `${window.location.origin}/u/${username}`
    navigator.clipboard?.writeText(url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const joined = t('profile.joined', {
    date: formatDate(createdAt, { month: 'short', year: 'numeric' }),
  })

  const stats: { value: string; label: string; color: string }[] = [
    { value: `${formatNum(positionsValue)} PT`, label: t('profile.positionsValue'), color: 'var(--text-primary)' },
    {
      value: biggestWin != null && biggestWin > 0 ? `+${formatNum(biggestWin)} PT` : '—',
      label: t('profile.biggestWin'),
      color: biggestWin != null && biggestWin > 0 ? 'var(--green)' : 'var(--text-tertiary)',
    },
    { value: formatNum(predictions), label: t('profile.predictionsStat'), color: 'var(--text-primary)' },
  ]

  return (
    <div className="card" style={{ padding: 24, position: 'relative', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Acciones arriba a la derecha */}
      <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 4 }}>
        {variant === 'own' && (
          <button onClick={onOpenSettings} aria-label={t('profile.settingsTitle')} title={t('profile.settingsTitle')} className="icon-btn">
            <Icon name="gear" size={17} />
          </button>
        )}
        <button onClick={share} aria-label={t('profile.shareProfile')} title={t('profile.shareProfile')} className="icon-btn" style={{ color: copied ? 'var(--green)' : undefined }}>
          <Icon name={copied ? 'check' : 'share'} size={17} />
        </button>
      </div>

      {/* Avatar + identidad */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', paddingRight: 84 }}>
        <Avatar name={displayName} url={avatarUrl} size={64} style={{ fontSize: 20 }} />
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </h1>
          <div className="meta-label" style={{ marginTop: 2 }}>
            @{username} · {joined}
          </div>
          {variant === 'own' && balance != null && (
            <div className="num" style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, fontWeight: 500 }}>
              {t('profile.balanceLabel')}: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatNum(Math.floor(balance))} PT</span>
            </div>
          )}
          {variant === 'public' && followersCount != null && (
            <div className="meta-label num" style={{ marginTop: 4 }}>
              {t('publicProfile.followers', { count: followersCount })} · {t('publicProfile.followsCount', { count: followingCount ?? 0 })}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="stat-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {stats.map(s => (
          <div key={s.label} style={{ minWidth: 0 }}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color, whiteSpace: 'nowrap' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Botones anchos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 'auto' }}>
        {variant === 'own' ? (
          <>
            <Link to="/mercados" className="btn btn-secondary">{t('profile.exploreMarkets')}</Link>
            <button onClick={onOpenSettings} className="btn btn-secondary">
              <Icon name="gift" size={14} />
              {t('profile.inviteFriends')}
            </button>
          </>
        ) : (
          <>
            {showFollow ? (
              <button onClick={onToggleFollow} disabled={followBusy} className={`btn ${isFollowing ? 'btn-secondary' : 'btn-primary'}`}>
                {isFollowing && <Icon name="check" size={14} />}
                {isFollowing ? t('publicProfile.followingBtn') : t('publicProfile.follow')}
              </button>
            ) : (
              <Link to="/mercados" className="btn btn-secondary">{t('profile.exploreMarkets')}</Link>
            )}
            <button onClick={share} className="btn btn-secondary">
              <Icon name={copied ? 'check' : 'share'} size={14} />
              {copied ? t('profile.copiedLink') : t('profile.shareProfile')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
