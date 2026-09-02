import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { track } from '../lib/analytics'
import { Icon } from './Icon'

// "Invita y gana PT" card for the profile page. Shares a /?ref=CODE link that
// the auth flow reads at signup. Both inviter and invitee get PT after the
// invitee's first trade.
export function ReferralCard({ code }: { code: string | null }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  if (!code) return null

  const link = `${window.location.origin}/?ref=${code}`
  const text = t('referral.shareText')

  return (
    <div className="list-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12, padding: '14px 0' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="gift" size={16} style={{ color: 'var(--text-tertiary)' }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{t('referral.title')}</div>
        </div>
        <div className="meta-label" style={{ marginTop: 2 }}>{t('referral.sub')}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <input
          className="input num"
          readOnly
          value={link}
          onFocus={e => e.currentTarget.select()}
          style={{ flex: '1 1 220px', minWidth: 0, height: 36, fontSize: 13, color: 'var(--text-secondary)' }}
        />
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text + ' ' + link)}`}
          target="_blank" rel="noopener noreferrer" aria-label={t('referral.shareWhatsApp')}
          onClick={() => track('Share', { channel: 'whatsapp', context: 'referral' })}
          className="icon-btn"
          style={{ border: '1px solid var(--border-subtle)' }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.358.101 11.892c0 2.096.549 4.142 1.595 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.582 0 11.94-5.358 11.944-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`}
          target="_blank" rel="noopener noreferrer" aria-label={t('referral.shareX')}
          onClick={() => track('Share', { channel: 'x', context: 'referral' })}
          className="icon-btn"
          style={{ border: '1px solid var(--border-subtle)' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </a>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => {
            navigator.clipboard?.writeText(link)
            setCopied(true)
            track('Share', { channel: 'copy', context: 'referral' })
            setTimeout(() => setCopied(false), 2000)
          }}
          style={{ height: 36, color: copied ? 'var(--green)' : undefined }}
        >
          <Icon name={copied ? 'check' : 'copy'} size={14} />
          {copied ? t('common.copied') : t('common.copy')}
        </button>
      </div>
    </div>
  )
}
