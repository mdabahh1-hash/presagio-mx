/**
 * Selector de jornada para una liga privada: competencia (tiles con escudo y
 * conteo real) + ventana de fechas (presets con conteo, o fechas a mano).
 *
 * El conteo replica en cliente la regla del backend (`seed_cycle_markets`):
 * mercados OPEN cuya `ends_at` cae en [from, to] y, si hay subcategoría, con
 * esa subcategoría exacta. Así el CTA nunca manda una combinación vacía y el
 * 422 CYCLE_EMPTY deja de ocurrir en la práctica.
 *
 * `markets` llega ya filtrado (status open, ends_at futuro) desde la página.
 */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Market } from '../../types'
import { SUBCATEGORIES } from '../../lib/categories'
import { CATEGORY_IMAGE, SUBCATEGORY_IMAGE, subcategoryIcon } from '../../lib/marketImage'
import { formatDateRange } from '../../lib/format'
import { Icon, type IconName } from '../Icon'

export type PresetKey = 'week' | '7d' | '14d' | 'month' | 'custom'
export const PRESETS: PresetKey[] = ['week', '7d', '14d', 'month', 'custom']

// Literales (no template): las claves de i18n están tipadas contra es.json.
const PRESET_LABEL = {
  week: 'leagues.create.preset.week',
  '7d': 'leagues.create.preset.7d',
  '14d': 'leagues.create.preset.14d',
  month: 'leagues.create.preset.month',
  custom: 'leagues.create.preset.custom',
} as const

export interface CycleSelection {
  /** null = "Todo mezclado": el backend siembra todo lo abierto en la ventana. */
  subcategory: string | null
  preset: PresetKey
  /** Solo para preset 'custom', formato YYYY-MM-DD del <input type="date">. */
  customFrom: string
  customTo: string
  /** Nombre de la jornada; mientras !nameEdited se recalcula solo. */
  name: string
  nameEdited: boolean
}

export interface ResolvedCycle {
  from: Date
  to: Date
  matched: Market[]
  autoName: string
  valid: boolean
}

function endOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** Ventana [from, to] de un preset en la zona horaria del navegador. */
export function presetWindow(
  preset: PresetKey,
  custom: Pick<CycleSelection, 'customFrom' | 'customTo'>,
  now: Date = new Date(),
): { from: Date; to: Date } | null {
  switch (preset) {
    case 'week': {
      const dow = now.getDay() // 0 = domingo
      return { from: now, to: endOfDay(addDays(now, dow === 0 ? 0 : 7 - dow)) }
    }
    case '7d':
      return { from: now, to: endOfDay(addDays(now, 7)) }
    case '14d':
      return { from: now, to: endOfDay(addDays(now, 14)) }
    case 'month':
      return { from: now, to: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)) }
    case 'custom': {
      if (!custom.customFrom || !custom.customTo) return null
      const from = new Date(`${custom.customFrom}T00:00:00`)
      const to = endOfDay(new Date(`${custom.customTo}T00:00:00`))
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null
      return { from: from < now ? now : from, to }
    }
  }
}

/** Misma regla que seed_cycle_markets del backend. */
export function matchMarkets(markets: Market[], subcategory: string | null, from: Date, to: Date): Market[] {
  const a = from.getTime()
  const b = to.getTime()
  return markets.filter(m => {
    if (subcategory && m.subcategory !== subcategory) return false
    const t = Date.parse(m.endsAt)
    return t >= a && t <= b
  })
}

export function resolveCycle(
  sel: CycleSelection,
  markets: Market[],
  allLabel: string,
  now: Date = new Date(),
): ResolvedCycle {
  const win = presetWindow(sel.preset, sel, now)
  if (!win) return { from: now, to: now, matched: [], autoName: '', valid: false }
  const matched = matchMarkets(markets, sel.subcategory, win.from, win.to)
  const autoName = `${sel.subcategory ?? allLabel} · ${formatDateRange(win.from, win.to)}`
  return { ...win, matched, autoName, valid: win.to > win.from }
}

/** Tiles en orden de conteo; solo subcategorías conocidas con ≥1 mercado abierto. */
export function subcategoryTiles(markets: Market[]): Array<{ sub: string; category: string; count: number }> {
  const counts = new Map<string, number>()
  for (const m of markets) {
    if (m.subcategory) counts.set(m.subcategory, (counts.get(m.subcategory) ?? 0) + 1)
  }
  const known = Object.entries(SUBCATEGORIES).flatMap(([category, subs]) =>
    (subs ?? []).map(sub => ({ sub, category })),
  )
  return known
    .map(k => ({ ...k, count: counts.get(k.sub) ?? 0 }))
    .filter(t => t.count > 0)
    .sort((a, b) => b.count - a.count)
}

/** Primer preset (no custom) con mercados para esa competencia. */
export function firstPresetWithMarkets(markets: Market[], subcategory: string | null, now: Date = new Date()): PresetKey | null {
  for (const p of PRESETS) {
    if (p === 'custom') continue
    const w = presetWindow(p, { customFrom: '', customTo: '' }, now)
    if (w && matchMarkets(markets, subcategory, w.from, w.to).length > 0) return p
  }
  return null
}

function dateISO(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function todayISO(): string {
  return dateISO(new Date())
}

/**
 * Ventana para una competencia: su primer preset con mercados; si ningún
 * preset alcanza (p. ej. dos mercados que cierran en tres meses), fechas a
 * mano de hoy al último cierre, para que la vista previa nunca arranque vacía.
 */
export function windowFor(
  markets: Market[],
  subcategory: string | null,
  now: Date = new Date(),
): Pick<CycleSelection, 'preset' | 'customFrom' | 'customTo'> {
  const preset = firstPresetWithMarkets(markets, subcategory, now)
  if (preset) return { preset, customFrom: '', customTo: '' }
  const pool = subcategory ? markets.filter(m => m.subcategory === subcategory) : markets
  const last = pool.reduce<number>((acc, m) => Math.max(acc, Date.parse(m.endsAt)), 0)
  if (!last) return { preset: '7d', customFrom: '', customTo: '' }
  return { preset: 'custom', customFrom: dateISO(now), customTo: dateISO(new Date(last)) }
}

/** Selección inicial: la competencia con más mercados y una ventana con datos. */
export function initialSelection(markets: Market[]): CycleSelection {
  const top = subcategoryTiles(markets)[0]?.sub ?? null
  return { subcategory: top, ...windowFor(markets, top), name: '', nameEdited: false }
}

interface TileProps {
  label: string
  count: string
  img?: string
  icon: IconName
  active: boolean
  onClick: () => void
}

function Tile({ label, count, img, icon, active, onClick }: TileProps) {
  return (
    <button type="button" className={`lg-tile${active ? ' is-active' : ''}`} aria-pressed={active} onClick={onClick}>
      <span className="lg-tile__img">
        {img ? <img src={img} alt="" loading="lazy" decoding="async" /> : <Icon name={icon} size={18} />}
      </span>
      <span className="lg-tile__text">
        <span className="lg-tile__name">{label}</span>
        <span className="lg-tile__count num">{count}</span>
      </span>
      {active && <Icon name="check" size={14} className="lg-tile__check" />}
    </button>
  )
}

interface Props {
  markets: Market[]
  value: CycleSelection
  onChange: (next: CycleSelection) => void
}

export function CyclePicker({ markets, value, onChange }: Props) {
  const { t } = useTranslation()

  const tiles = useMemo(() => subcategoryTiles(markets), [markets])

  const presetCounts = useMemo(() => {
    const now = new Date()
    const out = {} as Record<PresetKey, number>
    for (const p of PRESETS) {
      const w = presetWindow(p, value, now)
      out[p] = w ? matchMarkets(markets, value.subcategory, w.from, w.to).length : 0
    }
    return out
  }, [markets, value.subcategory, value.customFrom, value.customTo, value.preset])

  function pickSubcategory(sub: string | null) {
    // Si la ventana activa se queda sin mercados, brincar a una que sí tenga.
    const w = presetWindow(value.preset, value)
    const keep = !!w && matchMarkets(markets, sub, w.from, w.to).length > 0
    onChange({ ...value, subcategory: sub, ...(keep ? {} : windowFor(markets, sub)) })
  }

  const today = todayISO()

  return (
    <>
      <section className="lg-form__section">
        <h2 className="lg-form__label">{t('leagues.create.competition')}</h2>
        <div className="lg-tiles" role="group" aria-label={t('leagues.create.competition')}>
          {tiles.map(tl => (
            <Tile
              key={tl.sub}
              label={tl.sub}
              count={t('leagues.create.openCount', { count: tl.count })}
              img={SUBCATEGORY_IMAGE[tl.sub] ?? CATEGORY_IMAGE[tl.category]}
              icon={subcategoryIcon(tl.sub, tl.category)}
              active={value.subcategory === tl.sub}
              onClick={() => pickSubcategory(tl.sub)}
            />
          ))}
          <Tile
            label={t('leagues.create.allMixed')}
            count={t('leagues.create.openCount', { count: markets.length })}
            icon="list"
            active={value.subcategory === null}
            onClick={() => pickSubcategory(null)}
          />
        </div>
      </section>

      <section className="lg-form__section">
        <h2 className="lg-form__label">{t('leagues.create.dates')}</h2>
        <div className="lg-presets" role="group" aria-label={t('leagues.create.dates')}>
          {PRESETS.map(p => {
            const active = value.preset === p
            const empty = p !== 'custom' && presetCounts[p] === 0
            return (
              <button
                key={p}
                type="button"
                className={`lg-preset${active ? ' is-active' : ''}`}
                aria-pressed={active}
                disabled={empty}
                onClick={() => onChange({ ...value, preset: p })}
              >
                {t(PRESET_LABEL[p])}
                {p !== 'custom' && <span className="lg-preset__count num">{presetCounts[p]}</span>}
              </button>
            )
          })}
        </div>

        {value.preset === 'custom' && (
          <div className="lg-dates">
            <label>
              <span>{t('leagues.create.from')}</span>
              <input
                type="date"
                className="input"
                min={today}
                value={value.customFrom}
                onChange={e => onChange({ ...value, customFrom: e.target.value })}
              />
            </label>
            <label>
              <span>{t('leagues.create.to')}</span>
              <input
                type="date"
                className="input"
                min={value.customFrom || today}
                value={value.customTo}
                onChange={e => onChange({ ...value, customTo: e.target.value })}
              />
            </label>
          </div>
        )}
      </section>
    </>
  )
}
