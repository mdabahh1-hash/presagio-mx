/**
 * Cliente API de Ligas Privadas.
 *
 * Usa `request` de ./api (agrega el token de auth cuando existe y normaliza
 * los errores estructurados {code, message}). `invitePreview` es un endpoint
 * público: funciona SIN sesión porque `request` solo agrega el header
 * Authorization cuando hay token y el backend no lo exige ahí.
 * Estos tipos espejean los schemas del backend.
 */
import { request } from './api'
import { SITE } from './embed'

export interface LeagueSummary {
  id: number
  name: string
  status: 'pending' | 'active' | 'archived'
  invite_code: string
  member_count: number
  min_members: number
  cycle_name: string | null
  my_rank: number | null
  pending_picks: number
}

export interface InvitePreview {
  name: string
  creator_name: string
  member_count: number
  min_members: number
  status: string
  cycle_name: string | null
  cycle_ends_at: string | null
}

export interface MyPrediction {
  outcome_id: number | null
  binary_side: 'yes' | 'no' | null
  stake: string
  price_at_prediction: string
  status: 'open' | 'won' | 'lost' | 'void'
  payout: string | null
}

export interface CycleMarket {
  // markets.id es un slug string en este backend, no un entero
  market_id: string
  question: string
  market_type: 'binary' | 'multi'
  closes_at: string
  is_open: boolean
  outcomes: Array<{ id?: number; outcome_key?: string; side?: 'yes' | 'no'; label?: string; price: string }>
  predicted_count: number
  my_prediction: MyPrediction | null
}

export interface Standing {
  user_id: number
  display_name: string
  balance: string
  hits: number
  total_resolved: number
  final_rank: number | null
  is_me: boolean
}

export interface Cycle {
  id: number
  cycle_number: number
  name: string
  status: 'open' | 'scoring' | 'resolved'
  initial_stack: string
  starts_at: string
  ends_at: string
  my_balance: string | null
  markets: CycleMarket[]
}

export interface LeagueDetail {
  id: number
  name: string
  status: 'pending' | 'active' | 'archived'
  invite_code: string
  creator_id: number
  min_members: number
  members: Array<{ user_id: number; display_name: string; role: string }>
  current_cycle: Cycle | null
  standings: Standing[]
}

export interface PredictionResult {
  id: number
  potential_payout: string
  new_balance: string
}

export interface RevealRow {
  user_id: number
  display_name: string
  selection_label: string
  stake: string
  status: string
  payout: string | null
}

// ---------------------------------------------------------------- calls

export const leaguesApi = {
  create: (name: string, minMembers = 4) =>
    request<LeagueSummary>('/leagues', {
      method: 'POST',
      body: JSON.stringify({ name, min_members: minMembers }),
    }),

  mine: () => request<LeagueSummary[]>('/leagues/mine'),

  // PÚBLICO, sin auth
  invitePreview: (code: string) =>
    request<InvitePreview>(`/leagues/invite/${encodeURIComponent(code)}`),

  join: (code: string) =>
    request<LeagueSummary>(`/leagues/invite/${encodeURIComponent(code)}/join`, { method: 'POST' }),

  detail: (id: number) => request<LeagueDetail>(`/leagues/${id}`),

  createCycle: (
    leagueId: number,
    body: { name: string; subcategory: string | null; starts_at: string; ends_at: string },
  ) => request<Cycle>(`/leagues/${leagueId}/cycles`, { method: 'POST', body: JSON.stringify(body) }),

  predict: (
    cycleId: number,
    body: { market_id: string; outcome_id?: number; binary_side?: 'yes' | 'no'; stake: number },
  ) => request<PredictionResult>(`/cycles/${cycleId}/predict`, { method: 'POST', body: JSON.stringify(body) }),

  standings: (cycleId: number) => request<Standing[]>(`/cycles/${cycleId}/standings`),

  reveal: (cycleId: number, marketId: string) =>
    request<RevealRow[]>(`/cycles/${cycleId}/reveal/${encodeURIComponent(marketId)}`),
}

// ---------------------------------------------------------------- helpers UI

export const PAYOUT_CAP = 20
export const STAKE_CHIPS = [500, 1000, 2500, 5000]

/** Payout proyectado con el mismo cap del backend, para pintar en vivo. */
export function potentialPayout(stake: number, price: number): number {
  if (price <= 0 || price >= 1) return 0
  return Math.min(stake / price, stake * PAYOUT_CAP)
}

/** Link de invitación corto que viaja por WhatsApp. */
export function inviteUrl(code: string): string {
  return `${SITE}/#/l/${code}`
}

/** Abre WhatsApp con el mensaje prellenado. Nunca compartir el link pelón. */
export function shareOnWhatsApp(leagueName: string, cycleName: string | null, code: string) {
  const msg = cycleName
    ? `Ya armé nuestra liga "${leagueName}" en Veredikt para ${cycleName}. Éntrale: ${inviteUrl(code)}`
    : `Ya armé nuestra liga "${leagueName}" en Veredikt. Éntrale: ${inviteUrl(code)}`
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
}
