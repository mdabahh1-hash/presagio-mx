import type { Market } from '../types'
import i18n from '../i18n'

// Jornada de la landing de Deportes: día del evento en CDMX (Intl pone la zona; no
// se restan horas a mano) y pestañas Hoy / Mañana / días concretos / Más adelante /
// Por resolverse. El instante del evento es kickoff_at (partidos) o, si no hay,
// el cierre del mercado (futuros, F1, boxeo).
export const CDMX_TZ = 'America/Mexico_City'
// 'hoy' | 'manana' | 'AAAA-MM-DD' (hasta +6 días) | 'later' | 'pending'
export type DiaKey = string
const FIJOS = new Set(['hoy', 'manana', 'later', 'pending'])

export function eventAt(m: Market): string {
  return m.kickoffAt ?? m.endsAt
}

function locale(): string {
  return i18n.language.startsWith('en') ? 'en-US' : 'es-MX'
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Clave 'AAAA-MM-DD' del día en CDMX (el locale en-CA imprime ISO)
export function dayKeyCdmx(iso: string | Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: CDMX_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
}

export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

// Un partido ya jugado (pendiente) de hoy se queda en Hoy; los demás pendientes van
// a Por resolverse. Un mercado abierto con evento pasado (el cierre tarda hasta
// 15 min) cuenta como hoy.
export function diaKeyOf(m: Market, today: string = dayKeyCdmx(new Date())): DiaKey {
  const key = dayKeyCdmx(eventAt(m))
  if (m.status === 'pending_resolution') return key === today ? 'hoy' : 'pending'
  if (key <= today) return 'hoy'
  if (key === addDays(today, 1)) return 'manana'
  return key <= addDays(today, 6) ? key : 'later'
}

export interface DiaGroup { key: DiaKey; items: Market[] }

// Grupos en orden de pestañas, solo los que tienen filas; dentro, por hora del evento
export function agruparPorDia(markets: Market[], today: string = dayKeyCdmx(new Date())): DiaGroup[] {
  const by = new Map<DiaKey, Market[]>()
  for (const m of markets) {
    const k = diaKeyOf(m, today)
    by.set(k, [...(by.get(k) ?? []), m])
  }
  const fechas = [...by.keys()].filter(k => !FIJOS.has(k)).sort()
  const orden: DiaKey[] = ['hoy', 'manana', ...fechas, 'later', 'pending']
  const porHora = (a: Market, b: Market) => Date.parse(eventAt(a)) - Date.parse(eventAt(b))
  return orden.filter(k => by.has(k)).map(k => ({ key: k, items: [...by.get(k)!].sort(porHora) }))
}

function fechaDe(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

// Etiqueta de pestaña: Hoy · Mañana · "Sáb 19" · Más adelante · Por resolverse
export function diaLabel(key: DiaKey): string {
  if (key === 'hoy') return i18n.t('deportes.dayToday')
  if (key === 'manana') return i18n.t('deportes.dayTomorrow')
  if (key === 'later') return i18n.t('deportes.dayLater')
  if (key === 'pending') return i18n.t('categoryBrowse.bucketPending')
  const s = new Intl.DateTimeFormat(locale(), { timeZone: 'UTC', weekday: 'short', day: 'numeric' }).format(fechaDe(key))
  return capitalize(s.replace('.', ''))
}

// "Martes 16 de septiembre" para el subtítulo; null en Más adelante / Por resolverse
export function diaLong(key: DiaKey, today: string = dayKeyCdmx(new Date())): string | null {
  const k = key === 'hoy' ? today : key === 'manana' ? addDays(today, 1) : key
  if (FIJOS.has(k)) return null
  return capitalize(new Intl.DateTimeFormat(locale(), { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(fechaDe(k)))
}

// "19:00" en CDMX
export function horaCdmx(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', { timeZone: CDMX_TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))
}

// "Sáb" en CDMX (columna de hora de un evento de otro día)
export function diaCortoCdmx(iso: string): string {
  const s = new Intl.DateTimeFormat(locale(), { timeZone: CDMX_TZ, weekday: 'short' }).format(new Date(iso))
  return capitalize(s.replace('.', ''))
}
