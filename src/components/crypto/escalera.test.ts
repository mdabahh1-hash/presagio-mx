import { describe, expect, it } from 'vitest'
import { medianaImplicita } from './escalera'

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
