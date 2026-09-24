import { describe, expect, it } from 'vitest'
import type { Market } from '../../types'
import { escaleraDe, medianaImplicita } from './escalera'

const p = (valor: number, yesPrice: number) => ({ valor, market: { yesPrice } })

describe('medianaImplicita', () => {
  it('interpola donde la escalera cruza el 50 %', () => {
    expect(medianaImplicita([p(100, 90), p(110, 60), p(120, 40), p(130, 10)])).toBe(115)
  })
  it('null si toda la escalera está de un lado', () => {
    expect(medianaImplicita([p(100, 90), p(110, 70)])).toBeNull()
    expect(medianaImplicita([p(100, 30), p(110, 10)])).toBeNull()
  })
})

describe('escaleraDe', () => {
  const m = (question: string, sub = 'Stablecoins') =>
    ({ question, subcategory: sub, status: 'open', marketType: 'binary', endsAt: '2026-10-31T23:59:00Z' }) as unknown as Market
  it('lee la redacción corta en miles de millones y la vieja en millones', () => {
    const e = escaleraDe([312, 313, 314, 315].map(n => m(`¿Las stablecoins cerrarán octubre en US$${n} mil millones o más?`)), 'Stablecoins')
    expect(e?.peldanos.map(p => p.valor)).toEqual([312e9, 313e9, 314e9, 315e9])
    expect(e?.peldanos[0].label).toBe('US$312 mil millones')
    const vieja = escaleraDe([309_500, 310_500, 311_500, 312_500].map(n =>
      m(`¿La capitalización de las stablecoins cerrará septiembre en US$${n.toLocaleString('en-US')} millones o más?`)), 'Stablecoins')
    expect(vieja?.peldanos[0].valor).toBe(309_500e6)
  })
})
