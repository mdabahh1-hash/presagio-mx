type Listener = (data: Record<string, unknown>) => void

class MarketSocket {
  private ws: WebSocket | null = null
  private listeners: Set<Listener> = new Set()
  private marketId: string | null = null
  private pingInterval: ReturnType<typeof setInterval> | null = null
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null

  connect(marketId: string) {
    if (this.marketId === marketId && this.ws?.readyState === WebSocket.OPEN) return
    this.disconnect()

    this.marketId = marketId
    const backendUrl = import.meta.env.VITE_API_URL ?? ''
    const wsBase = backendUrl
      ? backendUrl.replace(/^http/, 'ws')
      : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`
    this.ws = new WebSocket(`${wsBase}/ws/market/${marketId}`)

    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        this.listeners.forEach(fn => fn(data))
      } catch {}
    }

    this.ws.onopen = () => {
      this.pingInterval = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send('ping')
        }
      }, 25_000)
    }

    this.ws.onclose = () => {
      if (this.pingInterval) clearInterval(this.pingInterval)
      // Auto-reconnect after 3 seconds
      this.reconnectTimeout = setTimeout(() => {
        if (this.marketId) this.connect(this.marketId)
      }, 3000)
    }
  }

  disconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout)
    if (this.pingInterval) clearInterval(this.pingInterval)
    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
      this.ws = null
    }
    this.marketId = null
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
}

export const marketSocket = new MarketSocket()

// Global activity feed socket
class FeedSocket {
  private ws: WebSocket | null = null
  private listeners: Set<Listener> = new Set()

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return
    const backendUrl = import.meta.env.VITE_API_URL ?? ''
    const wsBase = backendUrl
      ? backendUrl.replace(/^http/, 'ws')
      : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`
    this.ws = new WebSocket(`${wsBase}/ws/feed`)
    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        this.listeners.forEach(fn => fn(data))
      } catch {}
    }
    this.ws.onclose = () => {
      setTimeout(() => this.connect(), 5000)
    }
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
}

export const feedSocket = new FeedSocket()
