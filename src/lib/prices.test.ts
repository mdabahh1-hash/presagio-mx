import { describe, expect, it } from 'vitest'
import { displayPair, isOutcomeNo, probColor } from './prices'

describe('prices', () => {
  it('displayPair siempre suma 100', () => {
    expect(displayPair(23.5)).toEqual({ yes: 24, no: 76 })
  })
  it('probColor: ≥65 verde, ≤35 rojo, en medio neutro', () => {
    expect(probColor(65)).toBe('var(--green)')
    expect(probColor(35)).toBe('var(--red)')
    expect(probColor(50)).toBe('var(--text-primary)')
  })
  it('isOutcomeNo distingue el No de una opción del No binario', () => {
    expect(isOutcomeNo('NO', 'A')).toBe(true)
    expect(isOutcomeNo('NO', 'NO')).toBe(false)
    expect(isOutcomeNo(null, 'A')).toBe(false)
    expect(isOutcomeNo('YES', 'YES')).toBe(false)
  })
})
