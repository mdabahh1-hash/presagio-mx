/**
 * #/ligas/crear — Crear liga en una sola pantalla: nombre + competencia +
 * fechas + vista previa de los mercados que entran + CTA.
 * #/ligas/:id/nuevo-ciclo — misma pantalla sin el nombre, para abrir otra
 * jornada en una liga existente (lo abren el podio y el estado "sin ciclo").
 *
 * El backend exige dos llamadas (POST /leagues y POST /leagues/:id/cycles).
 * Si la segunda falla, `leagueId` se conserva para reintentar solo el ciclo y
 * no duplicar la liga. La vista previa replica el filtro del seeder, así que
 * el CTA solo se habilita cuando de verdad hay mercados.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Market } from '../../types'
import { marketsApi } from '../../lib/api'
import { apiToMarket } from '../../lib/mapMarket'
import { LeagueDetail, leaguesApi } from '../../lib/leaguesApi'
import {
  CyclePicker,
  CycleSelection,
  initialSelection,
  resolveCycle,
} from '../../components/leagues/CyclePicker'
import { CyclePreview } from '../../components/leagues/CyclePreview'

export function CreateLeaguePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id: existingId } = useParams<{ id?: string }>()
  const existingLeagueId = existingId ? Number(existingId) : null
  const isNewCycle = existingLeagueId !== null

  const [name, setName] = useState('')
  const [markets, setMarkets] = useState<Market[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [league, setLeague] = useState<LeagueDetail | null>(null)
  const [sel, setSel] = useState<CycleSelection | null>(null)
  // Se llena al crear la liga; si el ciclo falla, el reintento no vuelve a crearla.
  const [leagueId, setLeagueId] = useState<number | null>(existingLeagueId)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const now = Date.now()
    marketsApi
      .listAll({ status: 'open', sort: 'ending' })
      .then(list => {
        if (!alive) return
        // El seeder solo toma OPEN; los vencidos sin resolver no cuentan.
        const open = list
          .filter(m => m.status === 'open' && Date.parse(m.ends_at) > now)
          .map(apiToMarket)
        setMarkets(open)
        setSel(initialSelection(open))
      })
      .catch(() => alive && setLoadError(true))
    if (existingLeagueId !== null) {
      leaguesApi.detail(existingLeagueId).then(l => alive && setLeague(l)).catch(() => {})
    }
    return () => {
      alive = false
    }
  }, [existingLeagueId])

  const allLabel = t('leagues.create.allMixed')
  const resolved = useMemo(
    () => (sel && markets ? resolveCycle(sel, markets, allLabel) : null),
    [sel, markets, allLabel],
  )
  const cycleName = sel?.nameEdited ? sel.name : resolved?.autoName ?? ''

  const canSubmit =
    !busy &&
    !!sel &&
    !!resolved &&
    resolved.valid &&
    resolved.matched.length > 0 &&
    cycleName.trim().length >= 3 &&
    (isNewCycle || name.trim().length >= 3)

  async function submit() {
    if (!canSubmit || !sel || !resolved) return
    setBusy(true)
    setError(null)
    try {
      let id = leagueId
      if (id === null) {
        const created = await leaguesApi.create(name.trim())
        id = created.id
        setLeagueId(id)
      }
      await leaguesApi.createCycle(id, {
        name: cycleName.trim(),
        subcategory: sel.subcategory,
        starts_at: resolved.from.toISOString(),
        ends_at: resolved.to.toISOString(),
      })
      navigate(isNewCycle ? `/ligas/${id}` : `/ligas/${id}?creada=1`)
    } catch (e) {
      setError((e as Error)?.message ?? t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  if (loadError) {
    return (
      <div className="lg-page lg-page--form">
        <p className="lg-form__error">{t('leagues.create.loadError')}</p>
      </div>
    )
  }

  if (!markets || !sel || !resolved) {
    return (
      <div className="lg-page lg-page--form lg-form" aria-busy="true">
        <div className="skeleton lg-sk lg-sk--title" />
        <div className="skeleton lg-sk lg-sk--input" />
        <div className="lg-tiles">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton lg-sk lg-sk--tile" />
          ))}
        </div>
        <div className="skeleton lg-sk lg-sk--card" />
      </div>
    )
  }

  return (
    <div className="lg-page lg-page--form">
      <form
        className="lg-form anim-1"
        onSubmit={e => {
          e.preventDefault()
          submit()
        }}
      >
        <header className="lg-form__head">
          {isNewCycle && existingLeagueId !== null && (
            <Link to={`/ligas/${existingLeagueId}`} className="lg-form__back">
              {t('leagues.create.backToLeague')}
            </Link>
          )}
          <h1>{isNewCycle ? t('leagues.create.newCycleTitle') : t('leagues.create.title')}</h1>
          <p>
            {isNewCycle
              ? league
                ? t('leagues.create.newCycleSubtitle', { league: league.name })
                : ''
              : t('leagues.create.subtitle')}
          </p>
        </header>

        {!isNewCycle && (
          <section className="lg-form__section">
            <label className="lg-form__label" htmlFor="league-name">
              {t('leagues.create.nameLabel')}
            </label>
            <input
              id="league-name"
              autoFocus
              className="input lg-form__input"
              placeholder={t('leagues.create.namePlaceholder')}
              value={name}
              maxLength={60}
              disabled={leagueId !== null}
              onChange={e => setName(e.target.value)}
            />
          </section>
        )}

        <CyclePicker markets={markets} value={sel} onChange={setSel} />

        <CyclePreview
          matched={resolved.matched}
          name={cycleName}
          nameEdited={sel.nameEdited}
          onNameChange={(n, edited) => setSel({ ...sel, name: n, nameEdited: edited })}
          subcategoryLabel={sel.subcategory ?? allLabel}
        />

        {error && <p className="lg-form__error" role="alert">{error}</p>}

        <div>
          <button type="submit" className="btn btn-primary btn-lg lg-form__cta" disabled={!canSubmit}>
            {busy
              ? t('common.loading')
              : isNewCycle
                ? t('leagues.create.newCycleCta')
                : t('leagues.create.cta')}
          </button>
          {!isNewCycle && <p className="meta-label lg-form__hint">{t('leagues.create.ctaHint')}</p>}
        </div>
      </form>
    </div>
  )
}
