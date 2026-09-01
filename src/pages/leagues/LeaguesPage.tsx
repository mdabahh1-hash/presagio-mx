/**
 * #/ligas — Mis ligas + CTA crear.
 * #/ligas/crear — Wizard 2 pasos (nombre -> primer ciclo).
 * #/ligas/:id/nuevo-ciclo — mismo wizard, directo al paso 2 para una liga
 * existente (lo abre el podio con "Arrancar siguiente ciclo").
 *
 * El selector de subcategoría se llena desde src/lib/categories.ts
 * (SUBCATEGORIES + SPORT_GROUPS, misma fuente que el rail). Al crear, la liga
 * queda en pending y se redirige a su home, que ya muestra el flujo de
 * compartir.
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LeagueSummary, leaguesApi } from '../../lib/leaguesApi'
import { SUBCATEGORIES, SPORT_GROUPS } from '../../lib/categories'

export function LeaguesPage() {
  const { t } = useTranslation()
  const [leagues, setLeagues] = useState<LeagueSummary[] | null>(null)

  useEffect(() => {
    leaguesApi.mine().then(setLeagues).catch(() => setLeagues([]))
  }, [])

  if (!leagues) return <div className="lg-page lg-skeleton" />

  return (
    <div className="lg-page">
      <header className="lg-header">
        <h1>{t('leagues.list.title')}</h1>
        <Link to="/ligas/crear" className="lg-btn lg-btn--primary">
          {t('leagues.list.create')}
        </Link>
      </header>

      {leagues.length === 0 ? (
        <div className="lg-empty lg-empty--hero">
          <p>{t('leagues.list.emptyTitle')}</p>
          <p className="lg-muted">{t('leagues.list.emptyBody')}</p>
          <Link to="/ligas/crear" className="lg-btn lg-btn--primary lg-btn--xl">
            {t('leagues.list.createFirst')}
          </Link>
        </div>
      ) : (
        <ul className="lg-cards">
          {leagues.map(l => (
            <li key={l.id}>
              <Link to={`/ligas/${l.id}`} className="lg-card">
                <div className="lg-card__top">
                  <span className="lg-card__name">{l.name}</span>
                  {l.pending_picks > 0 && (
                    <span className="lg-chip lg-chip--alert">
                      {t('leagues.list.pendingPicks', { n: l.pending_picks })}
                    </span>
                  )}
                </div>
                <div className="lg-card__meta">
                  <span>{t('leagues.list.members', { n: l.member_count })}</span>
                  {l.cycle_name && <span>{l.cycle_name}</span>}
                  {l.my_rank && <span>{t('leagues.list.rank', { pos: l.my_rank })}</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ================================================================ wizard

/** Opciones del select: Deportes agrupado por deporte, resto por categoría. */
function SubcategoryOptions() {
  const groups: Array<{ label: string; subs: string[] }> = []
  for (const [category, subs] of Object.entries(SUBCATEGORIES)) {
    if (!subs) continue
    if (category === 'Deportes') {
      const grouped = new Set<string>()
      for (const [sport, leagues] of Object.entries(SPORT_GROUPS)) {
        const present = leagues.filter(l => subs.includes(l))
        if (present.length) {
          groups.push({ label: `Deportes · ${sport}`, subs: present })
          present.forEach(s => grouped.add(s))
        }
      }
      const rest = subs.filter(s => !grouped.has(s))
      if (rest.length) groups.push({ label: 'Deportes', subs: rest })
    } else {
      groups.push({ label: category, subs })
    }
  }
  return (
    <>
      {groups.map(g => (
        <optgroup key={g.label} label={g.label}>
          {g.subs.map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  )
}

export function CreateLeaguePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  // En /ligas/:id/nuevo-ciclo llega el id de una liga existente: directo al paso 2.
  const { id: existingId } = useParams<{ id?: string }>()

  const [step, setStep] = useState<1 | 2>(existingId ? 2 : 1)
  const [name, setName] = useState('')
  const [leagueId, setLeagueId] = useState<number | null>(existingId ? Number(existingId) : null)

  const [cycleName, setCycleName] = useState('')
  const [subcategory, setSubcategory] = useState<string>('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function createLeague() {
    if (name.trim().length < 3) return
    setBusy(true)
    setError(null)
    try {
      const league = await leaguesApi.create(name.trim())
      setLeagueId(league.id)
      setStep(2)
    } catch (e) {
      setError((e as Error)?.message ?? t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  async function createCycle() {
    if (!leagueId) return
    setBusy(true)
    setError(null)
    try {
      await leaguesApi.createCycle(leagueId, {
        name: cycleName.trim(),
        subcategory: subcategory || null,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
      })
      navigate(`/ligas/${leagueId}`)
    } catch (e) {
      // CYCLE_EMPTY llega traducido: "No hay mercados abiertos en esas fechas"
      setError((e as Error)?.message ?? t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="lg-page lg-wizard">
      <div className="lg-wizard__steps">
        <span className={step === 1 ? 'is-active' : 'is-done'}>1</span>
        <span className={step === 2 ? 'is-active' : ''}>2</span>
      </div>

      {step === 1 && (
        <>
          <h1>{t('leagues.create.nameTitle')}</h1>
          <input
            autoFocus
            className="lg-input"
            placeholder={t('leagues.create.namePlaceholder')}
            value={name}
            maxLength={60}
            onChange={e => setName(e.target.value)}
          />
          {error && <p className="lg-error">{error}</p>}
          <button
            className="lg-btn lg-btn--primary lg-btn--xl"
            disabled={name.trim().length < 3 || busy}
            onClick={createLeague}
          >
            {t('common.continue')}
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <h1>{t('leagues.create.cycleTitle')}</h1>
          <p className="lg-muted">{t('leagues.create.cycleHint')}</p>

          <input
            className="lg-input"
            placeholder={t('leagues.create.cyclePlaceholder')}
            value={cycleName}
            maxLength={80}
            onChange={e => setCycleName(e.target.value)}
          />

          <select className="lg-input" value={subcategory} onChange={e => setSubcategory(e.target.value)}>
            <option value="">{t('leagues.create.allSubcats')}</option>
            <SubcategoryOptions />
          </select>

          <label className="lg-label">
            {t('leagues.create.from')}
            <input
              type="datetime-local"
              className="lg-input"
              value={startsAt}
              onChange={e => setStartsAt(e.target.value)}
            />
          </label>
          <label className="lg-label">
            {t('leagues.create.to')}
            <input
              type="datetime-local"
              className="lg-input"
              value={endsAt}
              onChange={e => setEndsAt(e.target.value)}
            />
          </label>

          {error && <p className="lg-error">{error}</p>}

          <button
            className="lg-btn lg-btn--primary lg-btn--xl"
            disabled={!cycleName.trim() || !startsAt || !endsAt || busy}
            onClick={createCycle}
          >
            {busy ? t('common.loading') : t('leagues.create.cta')}
          </button>
        </>
      )}
    </div>
  )
}
