import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { proposalsApi } from '../lib/api'
import { track } from '../lib/analytics'
import { translateApiError } from '../lib/errors'

const CATEGORIES = ['Deportes', 'Política', 'Economía', 'Crypto', 'Tech', 'Clima', 'Otro']

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)', borderRadius: 10,
  padding: '11px 14px', fontSize: '0.9rem', color: 'var(--text-primary)',
  fontFamily: 'DM Sans', outline: 'none', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.68rem', color: 'var(--text-tertiary)',
  display: 'block', marginBottom: 5, fontWeight: 700,
  letterSpacing: '0.07em', textTransform: 'uppercase',
}

export function Propose() {
  const { t } = useTranslation()
  const [question, setQuestion] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [description, setDescription] = useState('')
  const [contact, setContact] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await proposalsApi.submit({
        question: question.trim(),
        category,
        description: description.trim() || undefined,
        proposer_contact: contact.trim() || undefined,
      })
      setSuccess(res.message)
      track('ProposeMarket', { category })
      setQuestion('')
      setDescription('')
      setContact('')
    } catch (err) {
      setError(translateApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-container" style={{ maxWidth: 560, margin: '0 auto', padding: '44px 24px 24px' }}>
      <h1 className="font-display anim-1" style={{ fontSize: 'clamp(1.9rem, 5vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 10px' }}>
        {t('propose.title')}
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 28px', lineHeight: 1.6 }}>
        {t('propose.intro')}
      </p>

      {success && (
        <div style={{
          margin: '0 0 20px', fontSize: '0.85rem', color: 'var(--green)',
          background: 'var(--green-soft)',
          border: '1px solid var(--green-border)',
          borderRadius: 10, padding: '14px 16px',
        }}>
          ✓ {success}
        </div>
      )}
      {error && (
        <div style={{
          margin: '0 0 20px', fontSize: '0.85rem', color: 'var(--red)',
          background: 'var(--red-soft)',
          border: '1px solid var(--red-border)',
          borderRadius: 10, padding: '14px 16px',
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="anim-2 card" style={{ padding: '26px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label style={labelStyle}>
            {t('propose.questionLabel')}
            <span style={{ float: 'right', fontFamily: 'DM Mono', textTransform: 'none', letterSpacing: 0 }}>
              {question.length}/200
            </span>
          </label>
          <input
            style={inputStyle}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            maxLength={200}
            placeholder={t('propose.questionPlaceholder')}
            required
          />
        </div>

        <div>
          <label style={labelStyle}>{t('propose.categoryLabel')}</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>{t('propose.descriptionLabel')}</label>
          <textarea
            style={{ ...inputStyle, resize: 'vertical', minHeight: 90 }}
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder={t('propose.descriptionPlaceholder')}
          />
        </div>

        <div>
          <label style={labelStyle}>{t('propose.contactLabel')}</label>
          <input
            style={inputStyle}
            value={contact}
            onChange={e => setContact(e.target.value)}
            maxLength={200}
            placeholder={t('propose.contactPlaceholder')}
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !question.trim()}
          style={{
            width: '100%', padding: '15px',
            background: 'linear-gradient(135deg, var(--oro-fill), var(--oro-fill-2))',
            border: 'none', borderRadius: 12, color: '#07071A',
            fontFamily: 'DM Sans', fontWeight: 800, fontSize: '0.92rem',
            letterSpacing: '0.05em',
            cursor: (submitting || !question.trim()) ? 'not-allowed' : 'pointer',
            opacity: (submitting || !question.trim()) ? 0.6 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {submitting ? t('propose.submitting') : t('propose.submit')}
        </button>
      </form>

      <p style={{ margin: '18px 0 0', fontSize: '0.7rem', color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.5 }}>
        {t('propose.reviewNote')}
      </p>
    </div>
  )
}
