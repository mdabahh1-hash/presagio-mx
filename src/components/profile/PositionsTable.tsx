import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ApiPosition, ApiHistoryEvent } from '../../lib/api'
import { formatNum, formatPnl, formatDate } from '../../lib/format'
import { Badge } from '../Badge'
import { Icon } from '../Icon'
import { Tabs } from '../Tabs'

interface Props {
  positions: ApiPosition[]
  history: ApiHistoryEvent[]
}

function positionValue(p: ApiPosition): number {
  return p.current_value ?? p.avg_cost * p.shares
}

function OutcomeBadge({ side, outcomeKey, outcomeLabel }: { side: string | null; outcomeKey: string | null; outcomeLabel?: string | null }) {
  const { t } = useTranslation()
  const isYes = side === 'YES'
  const isNo = side === 'NO'
  const label = isYes ? t('common.yes') : isNo ? t('common.no') : (outcomeLabel ?? outcomeKey ?? '—')
  return (
    <Badge tone={isYes ? 'green' : isNo ? 'red' : 'neutral'} style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {label}
    </Badge>
  )
}

function EmptyState({ text }: { text: string }) {
  const { t } = useTranslation()
  return (
    <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-secondary)' }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%', background: 'var(--bg-elevated)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px', color: 'var(--text-tertiary)',
      }}>
        <Icon name="chart" size={22} />
      </div>
      <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>{text}</p>
      <Link to="/mercados" className="btn btn-secondary btn-sm">
        {t('profile.explore')}
      </Link>
    </div>
  )
}

const headStyle: React.CSSProperties = {
  fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 500,
}

export function PositionsTable({ positions, history }: Props) {
  const { t } = useTranslation()
  const [subTab, setSubTab] = useState<'active' | 'closed'>('active')
  const [query, setQuery] = useState('')
  const [sortDesc, setSortDesc] = useState(true)

  const q = query.trim().toLowerCase()

  const activeRows = useMemo(() => {
    const filtered = q
      ? positions.filter(p => p.market_question.toLowerCase().includes(q))
      : positions
    return [...filtered].sort((a, b) =>
      sortDesc ? positionValue(b) - positionValue(a) : positionValue(a) - positionValue(b))
  }, [positions, q, sortDesc])

  const closedRows = useMemo(() => {
    const resolved = history.filter(e => e.type === 'win' || e.type === 'loss')
    const filtered = q
      ? resolved.filter(e => (e.market_question ?? '').toLowerCase().includes(q))
      : resolved
    return [...filtered].sort((a, b) =>
      sortDesc ? Math.abs(b.amount) - Math.abs(a.amount) : Math.abs(a.amount) - Math.abs(b.amount))
  }, [history, q, sortDesc])

  return (
    <div>
      {/* Controles: sub-tabs + búsqueda + orden */}
      <div className="profile-controls-row" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <Tabs<'active' | 'closed'>
          size="sm"
          items={[
            { key: 'active', label: t('profile.subTabActive') },
            { key: 'closed', label: t('profile.subTabClosed') },
          ]}
          active={subTab}
          onChange={setSubTab}
          style={{ flexShrink: 0 }}
        />
        <input
          className="input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('profile.searchPositions')}
          style={{ flex: 1, minWidth: 160, height: 36 }}
        />
        <button onClick={() => setSortDesc(d => !d)} className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }}>
          {t('profile.sortValue')}
          <Icon name={sortDesc ? 'chevron-down' : 'chevron-up'} size={14} />
        </button>
      </div>

      {subTab === 'active' && (
        activeRows.length === 0 ? (
          <EmptyState text={t('profile.noPositions')} />
        ) : (
          <div>
            <div className="positions-table-head" style={{
              display: 'grid', gridTemplateColumns: '1fr 90px 90px 110px', gap: 12,
              padding: '0 16px 10px', borderBottom: '1px solid var(--border-subtle)',
            }}>
              <span style={headStyle}>{t('profile.colMarket')}</span>
              <span style={{ ...headStyle, textAlign: 'right' }}>{t('profile.colAvg')}</span>
              <span style={{ ...headStyle, textAlign: 'right' }}>{t('profile.colCurrent')}</span>
              <span style={{ ...headStyle, textAlign: 'right' }}>{t('profile.colValue')}</span>
            </div>
            {activeRows.map(p => {
              const value = positionValue(p)
              const curColor = p.current_price == null
                ? 'var(--text-tertiary)'
                : p.current_price >= p.avg_cost ? 'var(--green)' : 'var(--red)'
              return (
                <Link key={p.id} to={`/mercado/${p.market_id}`} style={{ textDecoration: 'none' }}>
                  <div className="positions-table-row row-active" style={{
                    display: 'grid', gridTemplateColumns: '1fr 90px 90px 110px', gap: 12,
                    padding: '14px 16px', alignItems: 'center',
                    borderBottom: '1px solid var(--border-subtle)', borderRadius: 8,
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <OutcomeBadge side={p.side} outcomeKey={p.outcome_key} />
                      <div style={{
                        fontSize: '0.87rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 6,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {p.market_question}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                        {t('profile.sharesAbbr', { value: p.shares.toFixed(2) })}
                      </div>
                    </div>
                    <div className="font-mono positions-table-sub" style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {p.avg_cost.toFixed(2)}
                    </div>
                    <div className="font-mono positions-table-sub" style={{ textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, color: curColor }}>
                      {p.current_price != null ? p.current_price.toFixed(2) : '—'}
                    </div>
                    <div className="font-mono" style={{ textAlign: 'right', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {formatNum(value)} PT
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )
      )}

      {subTab === 'closed' && (
        closedRows.length === 0 ? (
          <EmptyState text={t('profile.noClosedPositions')} />
        ) : (
          <div>
            {closedRows.map((e, i) => {
              const won = e.type === 'win'
              const row = (
                <div className="positions-table-row" style={{
                  display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12,
                  padding: '14px 16px', alignItems: 'center',
                  borderBottom: '1px solid var(--border-subtle)', borderRadius: 8,
                }}>
                  <div style={{ minWidth: 0 }}>
                    <OutcomeBadge side={e.side} outcomeKey={e.outcome_key} outcomeLabel={e.outcome_label} />
                    <div style={{
                      fontSize: '0.87rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 6,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {e.market_question ?? '—'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                      {formatDate(e.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <Badge tone={won ? 'green' : 'red'} icon={won ? 'check' : 'x'}>
                    {won ? t('profile.historyBadgeWin') : t('profile.historyBadgeLoss')}
                  </Badge>
                  <span className="font-mono" style={{
                    fontSize: '0.95rem', fontWeight: 700, flexShrink: 0, textAlign: 'right', minWidth: 90,
                    color: e.amount >= 0 ? 'var(--green)' : 'var(--red)',
                  }}>
                    {formatPnl(e.amount)}
                  </span>
                </div>
              )
              return e.market_id
                ? <Link key={i} to={`/mercado/${e.market_id}`} style={{ textDecoration: 'none' }}>{row}</Link>
                : <div key={i}>{row}</div>
            })}
          </div>
        )
      )}
    </div>
  )
}
