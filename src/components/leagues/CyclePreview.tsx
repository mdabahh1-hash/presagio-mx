/**
 * Vista previa de la jornada: cuántos mercados entran, cuándo cierra el
 * último, el nombre (automático, editable) y las primeras preguntas.
 * Con 0 mercados muestra el estado vacío y la página deshabilita el CTA.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Market } from '../../types'
import { formatDate } from '../../lib/format'
import { MarketThumb } from '../MarketThumb'

const PREVIEW_ROWS = 4

interface Props {
  matched: Market[]
  /** Nombre efectivo de la jornada (automático o editado). */
  name: string
  nameEdited: boolean
  onNameChange: (name: string, edited: boolean) => void
  /** Etiqueta de la competencia para el estado vacío. */
  subcategoryLabel: string
}

export function CyclePreview({ matched, name, nameEdited, onNameChange, subcategoryLabel }: Props) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)

  const sorted = [...matched].sort((a, b) => Date.parse(a.endsAt) - Date.parse(b.endsAt))
  const lastClose = sorted.length ? sorted[sorted.length - 1].endsAt : null
  const rows = expanded ? sorted : sorted.slice(0, PREVIEW_ROWS)
  const hidden = sorted.length - rows.length

  function startEdit() {
    setDraft(name)
    setEditing(true)
  }

  function finishEdit() {
    const clean = draft.trim()
    // Vacío = volver al nombre automático.
    onNameChange(clean, clean.length > 0)
    setEditing(false)
  }

  return (
    <section className="card lg-preview" aria-live="polite">
      <div className="lg-preview__head">
        <h2 className="lg-preview__title">{t('leagues.create.previewTitle')}</h2>
        {lastClose && (
          <span className="lg-preview__summary num">
            {t('leagues.create.previewSummary', {
              n: sorted.length,
              date: formatDate(lastClose, { weekday: 'short', day: 'numeric', month: 'short' }),
            })}
          </span>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="lg-preview__empty">
          <p className="lg-preview__empty-title">{t('leagues.create.emptyTitle', { sub: subcategoryLabel })}</p>
          <p className="lg-preview__empty-hint">{t('leagues.create.emptyHint')}</p>
        </div>
      ) : (
        <>
          <div className="lg-preview__name">
            <span className="lg-preview__name-label">{t('leagues.create.cycleName')}</span>
            {editing ? (
              <>
                <input
                  autoFocus
                  className="input"
                  value={draft}
                  maxLength={80}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') finishEdit()
                    if (e.key === 'Escape') setEditing(false)
                  }}
                />
                <button type="button" className="btn btn-secondary btn-sm" onClick={finishEdit}>
                  {t('leagues.create.doneName')}
                </button>
              </>
            ) : (
              <>
                <span className={`lg-preview__name-value${nameEdited ? '' : ' is-auto'}`}>{name}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={startEdit}>
                  {t('leagues.create.changeName')}
                </button>
              </>
            )}
          </div>

          <ul className="lg-preview__list">
            {rows.map(m => (
              <li key={m.id} className="list-row lg-preview__row">
                <MarketThumb market={m} size={32} radius={8} />
                <span className="lg-preview__q">{m.question}</span>
                <span className="lg-preview__close">
                  {formatDate(m.endsAt, { weekday: 'short', day: 'numeric' })}
                </span>
              </li>
            ))}
          </ul>

          {(hidden > 0 || expanded) && sorted.length > PREVIEW_ROWS && (
            <button type="button" className="btn btn-ghost btn-sm lg-preview__more" onClick={() => setExpanded(v => !v)}>
              {expanded ? t('leagues.create.showLess') : t('leagues.create.showAll', { n: sorted.length })}
            </button>
          )}
        </>
      )}
    </section>
  )
}
