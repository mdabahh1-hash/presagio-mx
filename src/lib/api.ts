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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...init.headers,
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? 'Error desconocido')
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
  resolution_criteria: string
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

export const marketsApi = {
  list: (params?: { category?: string; q?: string; sort?: string }) => {
    const qs = new URLSearchParams()
    if (params?.category) qs.set('category', params.category)
    if (params?.q) qs.set('q', params.q)
    if (params?.sort) qs.set('sort', params.sort)
    return request<ApiMarket[]>(`/markets?${qs}`)
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
  execute: (marketId: string, opts: { side?: 'YES' | 'NO'; outcome_key?: string; points: number }) =>
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

export const usersApi = {
  me: () => request<ApiUser>('/users/me'),
  myPositions: () => request<ApiPosition[]>('/users/me/positions'),
  pointsHistory: () => request<ApiPointsHistory[]>('/users/me/points-history'),
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
  claimDailyBonus: () =>
    request<{ awarded: number; streak: number; new_balance: number }>('/users/me/daily-bonus', { method: 'POST' }),
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
}

// ── Admin ──────────────────────────────────────────────────────────────────

export const adminApi = {
  listAllMarkets: () => request<ApiMarket[]>('/markets?status=all&limit=100'),
  resolveMarket: (marketId: string, opts: { resolution?: string; outcome_key?: string }) =>
    request<{ ok: boolean; resolution: string; positions_settled: number }>(
      `/admin/markets/${marketId}/resolve`,
      { method: 'POST', body: JSON.stringify(opts) }
    ),
}
