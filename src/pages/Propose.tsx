import React, { useState } from 'react'
import { proposalsApi } from '../lib/api'
import { track } from '../lib/analytics'

const CATEGORIES = ['Mundial 2026', 'Banxico', 'Crypto', 'Liga MX', 'Clima', 'Boxeo', 'Motor', 'Otro']

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
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-container" style={{ maxWidth: 560, margin: '0 auto', padding: '44px 24px 24px' }}>
      <h1 className="font-display anim-1" style={{ fontSize: 'clamp(1.9rem, 5vw, 2.6rem)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 10px' }}>
        Proponer mercado
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 28px', lineHeight: 1.6 }}>
        ¿Hay algo sobre lo que te gustaría predecir? Cuéntanos y lo revisamos.
        No necesitas cuenta para proponer.
      </p>

      {success && (
        <div style={{
          margin: '0 0 20px', fontSize: '0.85rem', color: 'var(--green)',
          background: 'rgba(0, 232, 125, 0.08)',
          border: '1px solid rgba(0, 232, 125, 0.2)',
          borderRadius: 10, padding: '14px 16px',
        }}>
          ✓ {success}
        </div>
      )}
      {error && (
        <div style={{
          margin: '0 0 20px', fontSize: '0.85rem', color: 'var(--red)',
          background: 'rgba(255, 45, 85, 0.08)',
          border: '1px solid rgba(255, 45, 85, 0.2)',
          borderRadius: 10, padding: '14px 16px',
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="anim-2 card" style={{ padding: '26px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label style={labelStyle}>
            Pregunta del mercado *
            <span style={{ float: 'right', fontFamily: 'DM Mono', textTransform: 'none', letterSpacing: 0 }}>
              {question.length}/200
            </span>
          </label>
          <input
            style={inputStyle}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            maxLength={200}
            placeholder="¿Ganará México la Copa Oro 2027?"
            required
          />
        </div>

        <div>
          <label style={labelStyle}>Categoría</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Descripción o criterio de resolución (opcional)</label>
          <textarea
            style={{ ...inputStyle, resize: 'vertical', minHeight: 90 }}
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="¿Cómo sabremos el resultado? ¿Cuál es la fuente oficial?"
          />
        </div>

        <div>
          <label style={labelStyle}>Tu email o usuario (opcional)</label>
          <input
            style={inputStyle}
            value={contact}
            onChange={e => setContact(e.target.value)}
            maxLength={200}
            placeholder="Para avisarte si publicamos tu mercado"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !question.trim()}
          style={{
            width: '100%', padding: '15px',
            background: 'linear-gradient(135deg, #FFD700, #cc9900)',
            border: 'none', borderRadius: 12, color: '#07071A',
            fontFamily: 'DM Sans', fontWeight: 800, fontSize: '0.92rem',
            letterSpacing: '0.05em',
            cursor: (submitting || !question.trim()) ? 'not-allowed' : 'pointer',
            opacity: (submitting || !question.trim()) ? 0.6 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {submitting ? 'ENVIANDO...' : 'ENVIAR PROPUESTA'}
        </button>
      </form>

      <p style={{ margin: '18px 0 0', fontSize: '0.7rem', color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: 1.5 }}>
        Revisamos cada propuesta manualmente antes de publicarla como mercado.
      </p>
    </div>
  )
}
