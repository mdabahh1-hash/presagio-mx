import { describe, expect, it } from 'vitest'
import { segmentosPartido } from './Marcador'
import { makeMarket } from '../../test/market'

describe('segmentosPartido', () => {
  it('un 1X2 da local, empate y visitante que suman 100', () => {
    const m = makeMarket({
      id: 'lmx-ame-tol', kind: 'partido', marketType: 'multi',
      outcomes: [
        { outcome_key: 'visitante', label: 'Toluca', price: 30 },
        { outcome_key: 'local', label: 'América', price: 48 },
        { outcome_key: 'empate', label: 'Empate', price: 24 },
      ],
    })
    const segs = segmentosPartido(m)!
    expect(segs.map(s => s.key)).toEqual(['local', 'empate', 'visitante'])
    expect(segs.reduce((a, s) => a + s.pct, 0)).toBeCloseTo(100)
    expect(segs[1].color).toBe('var(--border-default)')
  })
  it('sin localía afirmable no pinta nada', () => {
    expect(segmentosPartido(makeMarket({ kind: 'partido', marketType: 'multi', outcomes: [{ outcome_key: 'a', label: 'A', price: 50 }] }))).toBeNull()
  })
})
