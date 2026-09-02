import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ApiHistoryEvent } from '../lib/api'
import { formatPnl, timeAgo } from '../lib/format'
import { Icon, type IconName } from './Icon'
import { Badge } from './Badge'

// Color del icono por tipo de evento.
function badgeStyle(type: ApiHistoryEvent['type']) {
  switch (type) {
    case 'win': return { color: 'var(--green)' }
    case 'loss': return { color: 'var(--red)' }
    default: return { color: 'var(--text-secondary)' }
  }
}

function iconFor(type: ApiHistoryEvent['type']): IconName {
  switch (type) {
    case 'trade': return 'trending'
    case 'win': return 'trophy'
    case 'loss': return 'x'
    case 'daily_bonus': return 'gift'
    case 'referral': return 'users'
    default: return 'coin'
  }
}

function amountColor(type: ApiHistoryEvent['type']) {
  if (type === 'win') return 'var(--green)'
  if (type === 'loss') return 'var(--red)'
  if (type === 'trade') return 'var(--text-secondary)' // spend, not P&L
  return 'var(--text-secondary)'
}

interface HistoryListProps {
  events: ApiHistoryEvent[]
  variant: 'own' | 'public'
}

export function HistoryList({ events, variant }: HistoryListProps) {
  const { t } = useTranslation()

  const evLabel = (e: ApiHistoryEvent) =>
    e.side === 'YES' ? t('common.yes') : e.side === 'NO' ? t('common.no') : (e.outcome_label ?? e.outcome_key ?? '')
  // price_after is the YES price for binary markets; a NO buyer paid the complement.
  const evPrice = (e: ApiHistoryEvent) =>
    Math.round(e.side === 'NO' ? 100 - (e.price_after ?? 0) : (e.price_after ?? 0))

  const badgeText = (e: ApiHistoryEvent) => {
    switch (e.type) {
      case 'trade': return t('profile.historyBadgeBuy')
      case 'win': return t('profile.historyBadgeWin')
      case 'loss': return t('profile.historyBadgeLoss')
      case 'daily_bonus': return t('profile.historyBadgeBonus')
      case 'referral': return t('profile.historyBadgeReferral')
      default: return t('profile.historyBadgeAdjustment')
    }
  }

  const lineText = (e: ApiHistoryEvent) => {
    const own = variant === 'own'
    const label = evLabel(e)
    switch (e.type) {
      case 'trade':
        return t(own ? 'profile.historyBuyText' : 'profile.historyBuyTextPublic', { label, price: evPrice(e) })
      case 'win':
        return t(own ? 'profile.historyWinText' : 'profile.historyWinTextPublic', { label })
      case 'loss':
        return t(own ? 'profile.historyLossText' : 'profile.historyLossTextPublic', { label })
      case 'daily_bonus':
        return t('profile.historyBonusText')
      case 'referral':
        return t('profile.historyReferralText')
      default:
        return t('profile.historyAdjustmentText')
    }
  }

  if (events.length === 0) {
    return (
      <div style={{ color: 'var(--text-secondary)', padding: '60px 0', textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', background: 'var(--bg-elevated)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', color: 'var(--text-tertiary)',
        }}>
          <Icon name="list" size={22} />
        </div>
        <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{t('profile.historyEmpty')}</p>
        <p style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>
          {variant === 'own' ? t('profile.historyEmptySub') : t('profile.historyEmptySubPublic')}
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {events.map((e, i) => {
        const b = badgeStyle(e.type)
        const card = (
          <div className={`list-row${e.market_id ? ' is-link' : ''}`} style={{ padding: '14px 0', gap: 14 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-elevated)', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: b.color,
            }}>
              <Icon name={iconFor(e.type)} size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Badge tone={e.type === 'win' ? 'green' : e.type === 'loss' ? 'red' : 'neutral'}>{badgeText(e)}</Badge>
                <span className="meta-label">{timeAgo(e.created_at)}</span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {lineText(e)}
                {e.market_question && (
                  <> <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{e.market_question}</span></>
                )}
              </p>
            </div>
            <div className="num" style={{ fontSize: 15, fontWeight: 600, color: amountColor(e.type), textAlign: 'right', flexShrink: 0 }}>
              {formatPnl(e.amount)}
            </div>
          </div>
        )
        const key = `${e.type}-${e.created_at}-${e.market_id ?? i}`
        return e.market_id ? (
          <Link key={key} to={`/mercado/${e.market_id}`} style={{ textDecoration: 'none' }}>
            {card}
          </Link>
        ) : (
          <div key={key}>{card}</div>
        )
      })}
    </div>
  )
}
