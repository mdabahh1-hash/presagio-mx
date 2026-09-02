import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function HowItWorks() {
  const { t } = useTranslation()
  const steps = [
    { n: '1', title: t('how.step1Title'), body: t('how.step1Body') },
    { n: '2', title: t('how.step2Title'), body: t('how.step2Body') },
    { n: '3', title: t('how.step3Title'), body: t('how.step3Body') },
    { n: '4', title: t('how.step4Title'), body: t('how.step4Body') },
  ]
  const faq = [
    { q: t('how.faq1Q'), a: t('how.faq1A') },
    { q: t('how.faq2Q'), a: t('how.faq2A') },
    { q: t('how.faq3Q'), a: t('how.faq3A') },
  ]
  return (
    <div className="page-container" style={{ maxWidth: 820, margin: '0 auto', padding: '48px 24px 24px' }}>
      <div className="anim-1" style={{ textAlign: 'center', marginBottom: 48 }}>
        <h1 className="font-display" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 14px' }}>
          {t('how.title')}
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
          {t('how.intro')}
        </p>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 48 }}>
        {steps.map((s, i) => (
          <div key={s.n} className={`card anim-${Math.min(i + 1, 6)}`} style={{ display: 'flex', gap: 18, padding: '22px 24px', alignItems: 'flex-start' }}>
            <div style={{
              flexShrink: 0, width: 42, height: 42, borderRadius: 12,
              background: 'var(--oro-dim)', border: '1px solid var(--oro-glow)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'DM Mono', fontWeight: 700, fontSize: '1.1rem', color: 'var(--gold)',
            }}>
              {s.n}
            </div>
            <div>
              <h3 className="font-display" style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {s.title}
              </h3>
              <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {s.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div style={{ marginBottom: 48 }}>
        <div className="exchange-header" style={{ marginBottom: 18 }}>{t('how.faqTitle')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {faq.map(f => (
            <div key={f.q} className="card" style={{ padding: '20px 24px' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>{f.q}</h4>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center' }}>
        <Link to="/mercados" style={{ textDecoration: 'none' }}>
          <button style={{
            background: 'var(--oro-fill)', border: 'none', padding: '15px 36px',
            color: '#07071A', fontFamily: 'DM Sans', fontWeight: 700,
            fontSize: '0.9rem', letterSpacing: '0.02em', borderRadius: 12, cursor: 'pointer',
            boxShadow: '0 8px 32px var(--oro-glow)',
          }}>
            {t('how.cta')}
          </button>
        </Link>
      </div>
    </div>
  )
}
