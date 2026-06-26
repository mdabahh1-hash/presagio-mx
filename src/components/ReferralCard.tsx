import React, { useState } from 'react'
import { track } from '../lib/analytics'

// "Invita y gana PT" card for the profile page. Shares a /?ref=CODE link that
// the auth flow reads at signup. Both inviter and invitee get PT after the
// invitee's first trade.
export function ReferralCard({ code }: { code: string | null }) {
  const [copied, setCopied] = useState(false)
  if (!code) return null

  const link = `${window.location.origin}/?ref=${code}`
  const text = '🔮 Únete a VEREDIKT, el mercado de predicción. Si te registras con mi link, ganamos 200 PT cada uno cuando hagas tu primera predicción:'

  const iconBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 34, height: 34, borderRadius: '50%',
    background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
    color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'none',
  }

  return (
    <div className="card" style={{ padding: '18px 20px', marginBottom: 20, border: '1px solid rgba(255,215,0,0.25)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span aria-hidden style={{ fontSize: '1rem' }}>🎁</span>
        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>Invita y ganen 200 PT cada uno</div>
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: 14 }}>
        Comparte tu link. Cuando tu invitado haga su primera predicción, ambos reciben 200 PT.
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <code style={{
          flex: '1 1 220px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 8,
          padding: '9px 12px', fontFamily: 'DM Mono', fontSize: '0.78rem', color: 'var(--text-secondary)',
        }}>{link}</code>

        <a
          href={`https://wa.me/?text=${encodeURIComponent(text + ' ' + link)}`}
          target="_blank" rel="noopener noreferrer" aria-label="Compartir en WhatsApp"
          onClick={() => track('Share', { channel: 'whatsapp', context: 'referral' })}
          style={iconBtn}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.358.101 11.892c0 2.096.549 4.142 1.595 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.582 0 11.94-5.358 11.944-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`}
          target="_blank" rel="noopener noreferrer" aria-label="Compartir en X"
          onClick={() => track('Share', { channel: 'x', context: 'referral' })}
          style={iconBtn}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </a>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(link)
            setCopied(true)
            track('Share', { channel: 'copy', context: 'referral' })
            setTimeout(() => setCopied(false), 2000)
          }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px',
            borderRadius: 99, background: 'var(--bg-elevated)',
            border: `1px solid ${copied ? 'var(--green)' : 'var(--border-default)'}`,
            color: copied ? 'var(--green)' : 'var(--text-secondary)', cursor: 'pointer',
            fontSize: '0.78rem', fontWeight: 600, fontFamily: 'DM Sans',
          }}
        >
          {copied ? '✓ ¡Copiado!' : 'Copiar'}
        </button>
      </div>
    </div>
  )
}
