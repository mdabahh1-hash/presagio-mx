import { describe, it, expect, beforeEach } from 'vitest'
import { marcarCompraPendiente, tomarCompraPendiente } from './compraPendiente'

describe('compraPendiente', () => {
  beforeEach(() => localStorage.clear())

  it('solo la toma el mismo mercado, una vez', () => {
    marcarCompraPendiente('/mercado/btc-oct?side=NO&monto=250', 1000)
    expect(tomarCompraPendiente('btc', 1000)).toBe(false)
    expect(tomarCompraPendiente('btc-oct', 1000)).toBe(true)
    expect(tomarCompraPendiente('btc-oct', 1000)).toBe(false)
  })

  it('vence a los 10 minutos', () => {
    marcarCompraPendiente('/mercado/btc-oct?side=YES', 0)
    expect(tomarCompraPendiente('btc-oct', 10 * 60_000 + 1)).toBe(false)
    expect(localStorage.length).toBe(0)
  })

  it('sin marca no hay compra', () => {
    expect(tomarCompraPendiente('btc-oct')).toBe(false)
  })
})
