import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Icon } from '../components/Icon'

// Página editorial: columna de lectura, pasos numerados en gris, FAQ en
// <details> y un solo CTA. Sin tarjetas por paso ni cuadros dorados.
export function HowItWorks() {
  const { t } = useTranslation()
  const steps = [
    { n: '01', title: t('how.step1Title'), body: t('how.step1Body') },
    { n: '02', title: t('how.step2Title'), body: t('how.step2Body') },
    { n: '03', title: t('how.step3Title'), body: t('how.step3Body') },
    { n: '04', title: t('how.step4Title'), body: t('how.step4Body') },
  ]
  const faq = [
    { q: t('how.faq1Q'), a: t('how.faq1A') },
    { q: t('how.faq2Q'), a: t('how.faq2A') },
    { q: t('how.faq3Q'), a: t('how.faq3A') },
  ]
  return (
    <div className="page-container anim-1" style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 32px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.015em', margin: '0 0 10px' }}>
        {t('how.title')}
      </h1>
      <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: '0 0 36px', lineHeight: 1.6, maxWidth: 560 }}>
        {t('how.intro')}
      </p>

      {/* Steps */}
      <ol style={{ listStyle: 'none', margin: '0 0 40px', padding: 0, display: 'flex', flexDirection: 'column' }}>
        {steps.map(s => (
          <li key={s.n} style={{ display: 'flex', gap: 20, padding: '18px 0', borderTop: '1px solid var(--border-subtle)' }}>
            <span className="num" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-tertiary)', width: 28, flexShrink: 0, paddingTop: 3 }}>
              {s.n}
            </span>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{s.title}</h3>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* FAQ */}
      <h2 className="section-title" style={{ marginBottom: 8 }}>{t('how.faqTitle')}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 40 }}>
        {faq.map(f => (
          <details key={f.q} className="faq-item" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <summary style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              padding: '14px 0', cursor: 'pointer', listStyle: 'none',
              fontSize: 15, fontWeight: 500, color: 'var(--text-primary)',
            }}>
              {f.q}
              <Icon name="chevron-down" size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} className="faq-chevron" />
            </summary>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.a}</p>
          </details>
        ))}
      </div>

      {/* CTA */}
      <Link to="/mercados" className="btn btn-primary btn-lg">
        {t('how.cta')}
        <Icon name="arrow-right" size={16} />
      </Link>
    </div>
  )
}
