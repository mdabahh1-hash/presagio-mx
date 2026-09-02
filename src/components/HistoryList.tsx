import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ApiHistoryEvent } from '../lib/api'
import { formatPnl, timeAgo } from '../lib/format'

// Badge palette per event type — same pill style as the positions tab.
function badgeStyle(type: ApiHistoryEvent['type']) {
  switch (type) {
    case 'win':
      return { color: 'var(--green)', bg: 'var(--green-soft)', border: 'var(--green-border)' }
    case 'loss':
      return { color: 'var(--red)', bg: 'var(--red-soft)', border: 'var(--red-border)' }
    default:
      return { color: 'var(--gold)', bg: 'var(--oro-dim)', border: 'var(--oro-glow)' }
  }
}

function amountColor(type: ApiHistoryEvent['type']) {
  if (type === 'win') return 'var(--green)'
  if (type === 'loss') return 'var(--red)'
  if (type === 'trade') return 'var(--text-secondary)' // spend, not P&L
  return 'var(--gold)'
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
          width: 60, height: 60, borderRadius: '50%',
          background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 18px', fontSize: '1.4rem',
        }}>📋</div>
        <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{t('profile.historyEmpty')}</p>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
          {variant === 'own' ? t('profile.historyEmptySub') : t('profile.historyEmptySubPublic')}
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {events.map((e, i) => {
        const b = badgeStyle(e.type)
        const card = (
          <div
            className="card"
            style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'center' }}
          >
            <div>
              <span style={{
                fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.03em',
                textTransform: 'uppercase', color: b.color, background: b.bg,
                border: `1px solid ${b.border}`, padding: '3px 10px', borderRadius: 99,
              }}>
                {badgeText(e)}
              </span>
              <p style={{ margin: '10px 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                {lineText(e)}
                {e.market_question && (
                  <> <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{e.market_question}</span></>
                )}
              </p>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 6 }}>
                {timeAgo(e.created_at)}
              </div>
            </div>
            <div className="font-mono" style={{ fontSize: '1rem', fontWeight: 700, color: amountColor(e.type), textAlign: 'right' }}>
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
