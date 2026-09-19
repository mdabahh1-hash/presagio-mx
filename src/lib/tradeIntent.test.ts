import { describe, it, expect } from 'vitest'
import { buildTradeRoute, parseTradeIntent } from './tradeIntent'
import { isSafeRoute } from './returnTo'

const parse = (q: string) => parseTradeIntent(new URLSearchParams(q))

describe('tradeIntent', () => {
  it('ida y vuelta: la ruta construida se lee igual', () => {
    const route = buildTradeRoute('nfl-dpoy-2026', { side: 'NO', amount: 250, outcomeKey: 'hutchinson' })!
    expect(route).toBe('/mercado/nfl-dpoy-2026?side=NO&monto=250&outcome=hutchinson')
    expect(isSafeRoute(route)).toBe(true)
    expect(parse(route.split('?')[1])).toEqual({ side: 'NO', amount: 250, outcomeKey: 'hutchinson' })
  })

  it('sin side válido no hay intención', () => {
    expect(parse('monto=250')).toBeNull()
    expect(parse('side=maybe&monto=250')).toBeNull()
    expect(parse('side=yes')).toBeNull()
  })

  it('monto y outcome inválidos se descartan sin tirar el side', () => {
    for (const monto of ['9', '0', '-5', '1e9', '12.5', '99999999', 'abc', '']) expect(parse(`side=YES&monto=${monto}`)).toEqual({ side: 'YES' })
    for (const outcome of ['<script>', 'a b', '../x', 'x'.repeat(101)]) expect(parse(`side=YES&outcome=${encodeURIComponent(outcome)}`)).toEqual({ side: 'YES' })
  })

  it('una ruta que no es segura (demasiado larga) no se construye', () => {
    expect(buildTradeRoute('m'.repeat(190), { side: 'YES', amount: 100 })).toBeUndefined()
  })
})

describe('isSafeRoute', () => {
  it('solo rutas internas', () => {
    for (const ok of ['/', '/mercado/x?side=NO&monto=250', '/l/abc123?join=1']) expect(isSafeRoute(ok)).toBe(true)
    for (const bad of ['//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', 'mercado/x', '/auth/callback?token=x', '/a#b', '/a b', '', null, undefined, '/' + 'a'.repeat(200)]) expect(isSafeRoute(bad)).toBe(false)
  })
})
