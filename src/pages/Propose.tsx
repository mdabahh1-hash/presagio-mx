import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { proposalsApi } from '../lib/api'
import { track } from '../lib/analytics'
import { translateApiError } from '../lib/errors'
import { Icon } from '../components/Icon'

const CATEGORIES = ['Deportes', 'Política', 'Economía', 'Crypto', 'Tech', 'Clima', 'Otro']

const inputStyle: React.CSSProperties = { width: '100%', display: 'block' }

const labelStyle: React.CSSProperties = {
  fontSize: 13, color: 'var(--text-secondary)',
  display: 'block', marginBottom: 6, fontWeight: 500,
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
    <div className="page-container anim-1" style={{ maxWidth: 600, margin: '0 auto', padding: '40px 24px 24px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em', margin: '0 0 6px' }}>
        {t('propose.title')}
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6 }}>
        {t('propose.intro')}
      </p>

      {success && (
        <div style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--green)', background: 'var(--green-soft)', borderRadius: 8, padding: '12px 14px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Icon name="check" size={16} strokeWidth={2.2} style={{ marginTop: 2 }} />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--red)', background: 'var(--red-soft)', borderRadius: 8, padding: '12px 14px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={labelStyle}>
            {t('propose.questionLabel')}
            <span className="num" style={{ float: 'right', color: 'var(--text-tertiary)' }}>
              {question.length}/200
            </span>
          </label>
          <input
            className="input"
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
            className="input"
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
            className="input"
            style={{ ...inputStyle, minHeight: 96 }}
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
            className="input"
            style={inputStyle}
            value={contact}
            onChange={e => setContact(e.target.value)}
            maxLength={200}
            placeholder={t('propose.contactPlaceholder')}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-lg" disabled={submitting || !question.trim()} style={{ width: '100%', marginTop: 4 }}>
          {submitting ? t('propose.submitting') : t('propose.submit')}
        </button>
      </form>

      <p className="meta-label" style={{ margin: '16px 0 0', textAlign: 'center', lineHeight: 1.5 }}>
        {t('propose.reviewNote')}
      </p>
    </div>
  )
}
