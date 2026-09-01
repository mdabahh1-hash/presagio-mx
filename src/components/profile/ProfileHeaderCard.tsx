import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatNum, formatDate } from '../../lib/format'

function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

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

const iconBtnStyle: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 10, cursor: 'pointer',
  background: 'transparent', border: '1px solid var(--border-default)',
  color: 'var(--text-secondary)', fontSize: '0.95rem',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
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
    <div className="card" style={{ padding: 28, position: 'relative', display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Acciones arriba a la derecha */}
      <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}>
        {variant === 'own' && (
          <button onClick={onOpenSettings} aria-label={t('profile.settingsTitle')} title={t('profile.settingsTitle')} style={iconBtnStyle}>
            ⚙
          </button>
        )}
        <button onClick={share} aria-label={t('profile.shareProfile')} title={t('profile.shareProfile')} style={iconBtnStyle}>
          {copied ? '✓' : '↗'}
        </button>
        {copied && (
          <span style={{
            position: 'absolute', top: 40, right: 0, whiteSpace: 'nowrap',
            fontSize: '0.7rem', color: 'var(--green)', fontWeight: 700,
            background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
            borderRadius: 8, padding: '4px 10px',
          }}>
            {t('profile.copiedLink')}
          </span>
        )}
      </div>

      {/* Avatar + identidad */}
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', paddingRight: 84 }}>
        <div style={{
          width: 88, height: 88, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
          background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, var(--oro-fill), var(--oro-fill-2))',
          border: '2px solid var(--oro-glow)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.7rem', fontWeight: 800, color: '#07071A', fontFamily: 'DM Sans',
        }}>
          {avatarUrl
            ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initials(displayName)}
        </div>
        <div style={{ minWidth: 0 }}>
          <h1 className="font-display" style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            {displayName}
          </h1>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
            @{username} · {joined}
          </div>
          {variant === 'own' && balance != null && (
            <div style={{ fontSize: '0.82rem', color: 'var(--gold)', marginTop: 4, fontWeight: 700 }}>
              {t('profile.balanceLabel')}: <span className="font-mono">{formatNum(Math.floor(balance))} PT</span>
            </div>
          )}
          {variant === 'public' && followersCount != null && (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
              {t('publicProfile.followers', { count: followersCount })} · {t('publicProfile.followsCount', { count: followingCount ?? 0 })}
            </div>
          )}
        </div>
      </div>

      {/* Stats con divisores */}
      <div style={{ display: 'flex' }}>
        {stats.map((s, i) => (
          <div key={s.label} style={{
            flex: 1, minWidth: 0, paddingLeft: i === 0 ? 0 : 18,
            borderLeft: i === 0 ? 'none' : '1px solid var(--border-subtle)',
          }}>
            <div className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: s.color, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
              {s.value}
            </div>
            <div style={{
              fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: 4,
              textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600,
            }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Botones anchos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 'auto' }}>
        {variant === 'own' ? (
          <>
            <Link to="/mercados" style={{ textDecoration: 'none' }}>
              <button style={{
                width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, var(--oro-fill), var(--oro-fill-2))', color: '#07071A',
                fontFamily: 'DM Sans', fontWeight: 800, fontSize: '0.88rem',
              }}>
                {t('profile.exploreMarkets')}
              </button>
            </Link>
            <button onClick={onOpenSettings} style={{
              width: '100%', padding: '12px 0', borderRadius: 10, cursor: 'pointer',
              background: 'transparent', border: '1px solid var(--border-default)',
              color: 'var(--text-primary)', fontFamily: 'DM Sans', fontWeight: 700, fontSize: '0.88rem',
            }}>
              {t('profile.inviteFriends')}
            </button>
          </>
        ) : (
          <>
            {showFollow ? (
              <button
                onClick={onToggleFollow}
                disabled={followBusy}
                style={isFollowing ? {
                  width: '100%', padding: '12px 0', borderRadius: 10, cursor: 'pointer',
                  background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
                  border: '1px solid var(--border-default)',
                  fontFamily: 'DM Sans', fontWeight: 700, fontSize: '0.88rem',
                  opacity: followBusy ? 0.6 : 1,
                } : {
                  width: '100%', padding: '12px 0', borderRadius: 10, cursor: 'pointer', border: 'none',
                  background: 'linear-gradient(135deg, var(--oro-fill), var(--oro-fill-2))', color: '#07071A',
                  fontFamily: 'DM Sans', fontWeight: 800, fontSize: '0.88rem',
                  opacity: followBusy ? 0.6 : 1,
                }}
              >
                {isFollowing ? t('publicProfile.followingBtn') : t('publicProfile.follow')}
              </button>
            ) : (
              <Link to="/mercados" style={{ textDecoration: 'none' }}>
                <button style={{
                  width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, var(--oro-fill), var(--oro-fill-2))', color: '#07071A',
                  fontFamily: 'DM Sans', fontWeight: 800, fontSize: '0.88rem',
                }}>
                  {t('profile.exploreMarkets')}
                </button>
              </Link>
            )}
            <button onClick={share} style={{
              width: '100%', padding: '12px 0', borderRadius: 10, cursor: 'pointer',
              background: 'transparent', border: '1px solid var(--border-default)',
              color: 'var(--text-primary)', fontFamily: 'DM Sans', fontWeight: 700, fontSize: '0.88rem',
            }}>
              {copied ? t('profile.copiedLink') : t('profile.shareProfile')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
