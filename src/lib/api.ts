import i18n from '../i18n'

const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api'

function getToken(): string | null {
  return localStorage.getItem('veredikt_token')
}

export function setToken(token: string) {
  localStorage.setItem('veredikt_token', token)
}

export function clearToken() {
  localStorage.removeItem('veredikt_token')
}

// Exported for feature-specific clients (leaguesApi). Attaches the token when
// present and normalizes {code, message} errors; callers get e.message already
// localized via errors.ts codes or the backend's Spanish message.
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...init.headers,
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    // FastAPI `detail` can be a string, a 422 array of error objects, or a
    // structured dict like {code: 'PRICE_MOVED', message: '...'}.
    const d = err?.detail
    const msg = typeof d === 'string'
      ? d
      : Array.isArray(d) ? (d[0]?.msg ?? i18n.t('errors.invalidData'))
      : (d && typeof d === 'object' && typeof d.message === 'string') ? d.message
      : i18n.t('errors.unknown')
    const e = new Error(msg) as Error & { status?: number; code?: string; detail?: unknown }
    e.status = res.status
    if (d && typeof d === 'object' && !Array.isArray(d)) {
      e.code = d.code
      e.detail = d
    }
    throw e
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// ── Markets ────────────────────────────────────────────────────────────────

export interface ApiOutcome {
  outcome_key: string
  label: string
  price: number
}

export interface ApiMarket {
  id: string
  question: string
  description: string
  category: string
  subcategory?: string | null
  kind?: 'partido' | 'accesorio' | null
  resolution_criteria: string
  resolution_source_url?: string | null
  /** Normas y Contexto del mercado (estilo Polymarket); solo llegan en el detalle. */
  rules?: string | null
  context?: string | null
  image_url?: string | null
  yes_price: number
  volume: number
  num_trades: number
  status: string
  trending: boolean
  ends_at: string
  created_at: string
  market_type: 'binary' | 'multi'
  outcomes: ApiOutcome[]
  resolved_outcome_key?: string | null
}

export interface ApiPricePoint {
  recorded_at: string
  yes_price: number
  volume_snapshot: number
  outcome_key?: string | null
}

export interface ApiComment {
  id: number
  market_id: string
  text: string
  likes: number
  created_at: string
  user: { id: number; username: string; display_name: string; avatar_url: string | null; points: number; markets_traded: number; accuracy: number; created_at: string }
}

export interface ApiQuote {
  market_id: string
  market_type: 'binary' | 'multi'
  side: 'YES' | 'NO' | null
  outcome_key: string | null
  amount: number
  mid_price: number
  mid_yes_price: number
  mid_no_price: number
  avg_fill_price: number
  price_after: number
  shares: number
  potential_payout: number
  potential_gain: number
  max_loss: number
  slippage_cost: number
  spread_pct: number
  slippage_pct: number
  liquidity_warning: boolean
  quote_expires_at: string
}

export const marketsApi = {
  quote: (id: string, opts: { side?: 'YES' | 'NO'; outcome_key?: string; amount: number }) => {
    const qs = new URLSearchParams({ amount: String(opts.amount) })
    if (opts.side) qs.set('side', opts.side)
    if (opts.outcome_key) qs.set('outcome_key', opts.outcome_key)
    return request<ApiQuote>(`/markets/${id}/quote?${qs}`)
  },
  list: (params?: { category?: string; subcategory?: string; kind?: string; q?: string; sort?: string; limit?: number; status?: string }) => {
    const qs = new URLSearchParams()
    if (params?.category) qs.set('category', params.category)
    if (params?.subcategory) qs.set('subcategory', params.subcategory)
    if (params?.kind) qs.set('kind', params.kind)
    if (params?.q) qs.set('q', params.q)
    if (params?.sort) qs.set('sort', params.sort)
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.status) qs.set('status', params.status)
    return request<ApiMarket[]>(`/markets?${qs}`)
  },
  // El backend capea limit a 100; una categoría (Deportes) puede rebasarlo.
  // Pagina con offset hasta recibir una página incompleta.
  listAll: async (params?: { category?: string; subcategory?: string; kind?: string; q?: string; sort?: string; status?: string }): Promise<ApiMarket[]> => {
    const PAGE = 100
    const all: ApiMarket[] = []
    for (let offset = 0; ; offset += PAGE) {
      const qs = new URLSearchParams()
      if (params?.category) qs.set('category', params.category)
      if (params?.subcategory) qs.set('subcategory', params.subcategory)
      if (params?.kind) qs.set('kind', params.kind)
      if (params?.q) qs.set('q', params.q)
      if (params?.sort) qs.set('sort', params.sort)
      if (params?.status) qs.set('status', params.status)
      qs.set('limit', String(PAGE))
      qs.set('offset', String(offset))
      const page = await request<ApiMarket[]>(`/markets?${qs}`)
      all.push(...page)
      if (page.length < PAGE) return all
    }
  },
  get: (id: string) =>
    request<ApiMarket & { b: number; q_yes: number; q_no: number }>(`/markets/${id}`),
  outcomes: (id: string) => request<ApiOutcome[]>(`/markets/${id}/outcomes`),
  history: (id: string, days = 60) => request<ApiPricePoint[]>(`/markets/${id}/history?days=${days}`),
  comments: (id: string) => request<ApiComment[]>(`/markets/${id}/comments`),
  postComment: (id: string, text: string) =>
    request<ApiComment>(`/markets/${id}/comments`, { method: 'POST', body: JSON.stringify({ text }) }),
  likeComment: (marketId: string, commentId: number) =>
    request<ApiComment>(`/markets/${marketId}/comments/${commentId}/like`, { method: 'POST' }),
}

// ── Trades ─────────────────────────────────────────────────────────────────

export interface TradeResponse {
  id: number
  market_id: string
  side: 'YES' | 'NO' | null
  outcome_key: string | null
  shares: number
  cost: number
  price_before: number
  price_after: number
  new_yes_price: number
  new_balance: number
  created_at: string
}

export const tradesApi = {
  execute: (marketId: string, opts: { side?: 'YES' | 'NO'; outcome_key?: string; points: number; quoted_avg_price?: number }) =>
    request<TradeResponse>(`/markets/${marketId}/trade`, {
      method: 'POST',
      body: JSON.stringify(opts),
    }),
  myPositions: (marketId: string) =>
    request<{ id: number; side: string | null; outcome_key: string | null; shares: number; avg_cost: number }[]>(
      `/markets/${marketId}/positions`
    ),
}

// ── Users ──────────────────────────────────────────────────────────────────

export interface ApiUser {
  id: number
  email: string
  username: string
  display_name: string
  avatar_url: string | null
  points: number
  markets_traded: number
  accuracy: number
  correct_predictions: number
  total_predictions: number
  created_at: string
  streak: number
  last_bonus_at: string | null
  email_notifications: boolean
  referral_code: string | null
  has_passkey: boolean
}

export type LeaderboardPeriod = 'today' | 'week' | 'month' | 'all'

export interface ApiProfilePublic {
  id: number
  username: string
  display_name: string
  avatar_url: string | null
  pnl: number
  volume: number
  markets_traded: number
  accuracy: number
  created_at: string
  followers_count: number
  following_count: number
  is_following: boolean | null
}

export interface ApiPosition {
  id: number
  market_id: string
  market_question: string
  side: string | null
  outcome_key: string | null
  shares: number
  avg_cost: number
  updated_at: string
  // Live LMSR mark: price 0-1 (same scale as avg_cost), value in PT.
  // null when the market is no longer tradeable.
  current_price: number | null
  current_value: number | null
}

export interface ApiPointsHistory {
  date: string
  price: number
}

export interface ApiLeaderboardEntry {
  id: number
  username: string
  display_name: string
  avatar_url: string | null
  pnl: number
  volume: number
  markets_traded: number
  accuracy: number
}

export interface ApiFollowedUser extends ApiLeaderboardEntry {
  points: number
  followed_at: string
  positions_count: number
  top_positions: ApiPosition[]
}

export interface ApiFeedTrade {
  id: number
  created_at: string
  side: 'YES' | 'NO' | null
  outcome_key: string | null
  outcome_label: string | null
  shares: number
  cost: number
  price_after: number
  username: string
  display_name: string
  avatar_url: string | null
  market_id: string
  market_question: string
  market_status: string
  market_type: 'binary' | 'multi'
}

export interface ApiHistoryEvent {
  type: 'trade' | 'win' | 'loss' | 'daily_bonus' | 'referral' | 'adjustment'
  created_at: string
  amount: number                 // signed PT: trade −cost · win +shares · loss −cost · credits +delta
  market_id: string | null
  market_question: string | null
  side: 'YES' | 'NO' | null
  outcome_key: string | null
  outcome_label: string | null
  shares: number | null
  price_after: number | null     // buys only; YES price 0-100 after the trade
}

export const usersApi = {
  me: () => request<ApiUser>('/users/me'),
  myPositions: () => request<ApiPosition[]>('/users/me/positions'),
  pointsHistory: (days = 30) => request<ApiPointsHistory[]>(`/users/me/points-history?days=${days}`),
  history: (limit = 50) => request<ApiHistoryEvent[]>(`/users/me/history?limit=${limit}`),
  publicHistory: (username: string, limit = 50) =>
    request<ApiHistoryEvent[]>(`/users/${username}/history?limit=${limit}`),
  leaderboard: (limit = 50, period: LeaderboardPeriod = 'all') => {
    const qs = new URLSearchParams({ limit: String(limit), period })
    return request<ApiLeaderboardEntry[]>(`/users/leaderboard?${qs}`)
  },
  attachReferral: (code: string) =>
    request<{ ok: boolean; reason?: string }>('/users/me/referral', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  update: (data: { display_name?: string; username?: string; email_notifications?: boolean }) =>
    request<ApiUser>('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
  get: (username: string) => request<ApiProfilePublic>(`/users/${username}`),
  publicPositions: (username: string) => request<ApiPosition[]>(`/users/${username}/positions`),
  follow: (username: string) =>
    request<{ following: boolean; followers_count: number }>(`/users/${username}/follow`, { method: 'POST' }),
  unfollow: (username: string) =>
    request<{ following: boolean; followers_count: number }>(`/users/${username}/follow`, { method: 'DELETE' }),
  following: () => request<ApiFollowedUser[]>('/users/me/following'),
  feed: (limit = 50) => request<ApiFeedTrade[]>(`/users/me/feed?limit=${limit}`),
  claimDailyBonus: () =>
    request<{ awarded: number; streak: number; new_balance: number }>('/users/me/daily-bonus', { method: 'POST' }),
}

// ── Proposals ──────────────────────────────────────────────────────────────

export const proposalsApi = {
  submit: (data: { question: string; category: string; description?: string; proposer_contact?: string }) =>
    request<{ ok: boolean; message: string }>('/proposals', { method: 'POST', body: JSON.stringify(data) }),
}

// ── Auth ───────────────────────────────────────────────────────────────────

export const authApi = {
  logout: () => request('/auth/logout', { method: 'POST' }),
  googleUrl: () => `${import.meta.env.VITE_API_URL ?? ''}/api/auth/google`,
  githubUrl: () => `${import.meta.env.VITE_API_URL ?? ''}/api/auth/github`,
  emailLogin: (email: string, password: string) =>
    request<{ token: string; user: ApiUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  emailRegister: (email: string, password: string, displayName: string) =>
    request<{ message: string; email: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, display_name: displayName }),
    }),
  verifyEmail: (email: string, code: string) =>
    request<{ token: string; user: ApiUser }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    }),
  passkeyRegisterOptions: () =>
    request<{ state: string; options: any }>('/auth/passkey/register/options', { method: 'POST' }),
  passkeyRegisterVerify: (state: string, credential: unknown) =>
    request<{ ok: boolean; message: string }>('/auth/passkey/register/verify', {
      method: 'POST',
      body: JSON.stringify({ state, credential }),
    }),
  passkeyLoginOptions: () =>
    request<{ state: string; options: any }>('/auth/passkey/login/options', { method: 'POST' }),
  passkeyLoginVerify: (state: string, credential: unknown) =>
    request<{ token: string; user: ApiUser }>('/auth/passkey/login/verify', {
      method: 'POST',
      body: JSON.stringify({ state, credential }),
    }),
  passkeyDelete: () => request<{ ok: boolean }>('/auth/passkey', { method: 'DELETE' }),
}

// ── Admin ──────────────────────────────────────────────────────────────────

export const adminApi = {
  // El backend capea limit a 100 y ya hay más mercados que eso: paginar
  // con offset hasta recibir una página incompleta.
  listAllMarkets: async (): Promise<ApiMarket[]> => {
    const PAGE = 100
    const all: ApiMarket[] = []
    for (let offset = 0; ; offset += PAGE) {
      const page = await request<ApiMarket[]>(`/markets?status=all&limit=${PAGE}&offset=${offset}`)
      all.push(...page)
      if (page.length < PAGE) return all
    }
  },
  resolveMarket: (marketId: string, opts: { resolution?: string; outcome_key?: string }) =>
    request<{ ok: boolean; resolution: string; positions_settled: number }>(
      `/admin/markets/${marketId}/resolve`,
      { method: 'POST', body: JSON.stringify(opts) }
    ),
}
