import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ApiPosition, ApiHistoryEvent } from '../../lib/api'
import { formatNum, formatPnl, formatDate } from '../../lib/format'

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
  const color = isYes ? 'var(--green)' : isNo ? 'var(--red)' : 'var(--gold)'
  const bg = isYes ? 'var(--green-soft)' : isNo ? 'var(--red-soft)' : 'var(--oro-dim)'
  const border = isYes ? 'var(--green-border)' : isNo ? 'var(--red-border)' : 'var(--oro-glow)'
  return (
    <span style={{
      fontSize: '0.62rem', fontWeight: 600, letterSpacing: '0.03em',
      textTransform: 'uppercase', color, background: bg,
      border: `1px solid ${border}`, padding: '2px 8px', borderRadius: 99,
      maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      display: 'inline-block', verticalAlign: 'middle',
    }}>
      {label}
    </span>
  )
}

function EmptyState({ text }: { text: string }) {
  const { t } = useTranslation()
  return (
    <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-secondary)' }}>
      <div style={{
        width: 60, height: 60, borderRadius: '50%',
        background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 18px', fontSize: '1.4rem',
      }}>📊</div>
      <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{text}</p>
      <Link to="/mercados" style={{ color: 'var(--blue)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600 }}>
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

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: '7px 16px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
    background: active ? 'var(--bg-elevated)' : 'transparent',
    color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
    transition: 'all 0.15s',
  })

  return (
    <div>
      {/* Controles: sub-tabs + búsqueda + orden */}
      <div className="profile-controls-row" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <div className="pill-group" style={{
          display: 'flex', gap: 2, padding: 3, borderRadius: 99,
          background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', flexShrink: 0,
        }}>
          <button onClick={() => setSubTab('active')} style={pillStyle(subTab === 'active')}>
            {t('profile.subTabActive')}
          </button>
          <button onClick={() => setSubTab('closed')} style={pillStyle(subTab === 'closed')}>
            {t('profile.subTabClosed')}
          </button>
        </div>
        <input
          className="input-dark"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('profile.searchPositions')}
          style={{ flex: 1, minWidth: 160 }}
        />
        <button
          onClick={() => setSortDesc(d => !d)}
          className="btn-ghost"
          style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 700 }}
        >
          {t('profile.sortValue')} {sortDesc ? '↓' : '↑'}
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
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase',
                    color: won ? 'var(--green)' : 'var(--red)',
                    background: won ? 'var(--green-soft)' : 'var(--red-soft)',
                    border: `1px solid ${won ? 'var(--green-border)' : 'var(--red-border)'}`,
                    padding: '3px 10px', borderRadius: 99, flexShrink: 0,
                  }}>
                    {won ? t('profile.historyBadgeWin') : t('profile.historyBadgeLoss')}
                  </span>
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
