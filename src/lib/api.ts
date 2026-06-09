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
}

export interface ApiPricePoint {
  recorded_at: string
  yes_price: number
  volume_snapshot: number
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
  get: (id: string) => request<ApiMarket & { b: number; q_yes: number; q_no: number }>(`/markets/${id}`),
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
  side: 'YES' | 'NO'
  shares: number
  cost: number
  price_before: number
  price_after: number
  new_yes_price: number
  new_balance: number
  created_at: string
}

export const tradesApi = {
  execute: (marketId: string, side: 'YES' | 'NO', points: number) =>
    request<TradeResponse>(`/markets/${marketId}/trade`, {
      method: 'POST',
      body: JSON.stringify({ side, points }),
    }),
  myPositions: (marketId: string) =>
    request<{ id: number; side: string; shares: number; avg_cost: number }[]>(
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
}

export interface ApiPosition {
  id: number
  market_id: string
  market_question: string
  side: string
  shares: number
  avg_cost: number
  updated_at: string
}

export interface ApiPointsHistory {
  date: string
  price: number
}

export const usersApi = {
  me: () => request<ApiUser>('/users/me'),
  myPositions: () => request<ApiPosition[]>('/users/me/positions'),
  pointsHistory: () => request<ApiPointsHistory[]>('/users/me/points-history'),
  update: (data: { display_name?: string; username?: string }) =>
    request<ApiUser>('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
  get: (username: string) => request<ApiUser>(`/users/${username}`),
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
    request<{ token: string; user: ApiUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, display_name: displayName }),
    }),
}

// ── Admin ──────────────────────────────────────────────────────────────────

export const adminApi = {
  listAllMarkets: () => request<ApiMarket[]>('/markets?status=all&limit=100'),
  resolveMarket: (marketId: string, resolution: 'YES' | 'NO') =>
    request<{ ok: boolean; resolution: string; positions_settled: number }>(
      `/admin/markets/${marketId}/resolve`,
      { method: 'POST', body: JSON.stringify({ resolution }) }
    ),
}
