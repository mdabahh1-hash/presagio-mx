// Helpers centrales de formato — consolidan las copias que vivían por archivo
// (formatVolume ×4, fmtPnl ×3, fmtNum ×2, formatCountdown, daysLeft ×2).
// El locale sigue al idioma activo de i18next; los componentes que los usan
// re-renderizan con useTranslation, así que el cambio de idioma se refleja solo.
//
// NO usar aquí para claves de negocio: DailyBonusPill usa 'en-CA' a propósito
// (clave YYYY-MM-DD anclada a hora de México) y no debe pasar por este módulo.
import i18n from '../i18n'

function locale(): string {
  return i18n.language.startsWith('en') ? 'en-US' : 'es-MX'
}

export function formatNum(n: number): string {
  return Math.round(n).toLocaleString(locale())
}

export function formatVolume(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return v.toFixed(0)
}

export function formatPnl(n: number): string {
  const r = Math.round(n)
  const sign = r >= 0 ? '+' : '−'
  return `${sign}${Math.abs(r).toLocaleString(locale())} PT`
}

export function formatDate(d: string | Date, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(d).toLocaleDateString(locale(), opts)
}

/* Countdown corto de MarketCard: "3d 4h", "2 meses", "12m 30s". Los sufijos
   d/h/m/s son iguales en ambos idiomas; solo mes(es) y "Cerrado" se traducen. */
export function formatCountdown(diff: number): { text: string; urgent: boolean } {
  if (diff <= 0) return { text: i18n.t('common.countdown.closed'), urgent: false }
  const totalSecs = Math.floor(diff / 1000)
  const days = Math.floor(totalSecs / 86400)
  const hours = Math.floor((totalSecs % 86400) / 3600)
  const mins = Math.floor((totalSecs % 3600) / 60)
  const secs = totalSecs % 60

  if (days >= 30) {
    const months = Math.floor(days / 30)
    return { text: i18n.t('common.countdown.month', { count: months }), urgent: false }
  }
  if (days >= 1) return { text: `${days}d ${hours}h`, urgent: days <= 1 }
  if (hours >= 1) return { text: `${hours}h ${mins}m`, urgent: true }
  return { text: `${mins}m ${secs}s`, urgent: true }
}

/* "Cierre" de un mercado: Resuelto / Pendiente / Cerrado / Hoy / N días. */
export function daysLeft(endsAt: string, status?: string): string {
  if (status === 'resolved_yes' || status === 'resolved_no' || status === 'resolved') {
    return i18n.t('common.days.resolved')
  }
  if (status === 'closed') return i18n.t('common.days.closed')
  if (status === 'pending_resolution') return i18n.t('common.days.pending')
  const diff = new Date(endsAt).getTime() - Date.now()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days < 0) return i18n.t('common.days.closed')
  if (days === 0) return i18n.t('common.days.today')
  return i18n.t('common.days.day', { count: days })
}

/* "hace 5 min" / "5 min ago" para el feed de Siguiendo. */
export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return i18n.t('following.timeNow')
  if (s < 3600) return i18n.t('following.timeMinutes', { count: Math.floor(s / 60) })
  if (s < 86400) return i18n.t('following.timeHours', { count: Math.floor(s / 3600) })
  return i18n.t('following.timeDays', { count: Math.floor(s / 86400) })
}
