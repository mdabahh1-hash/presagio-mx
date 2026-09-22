import { describe, expect, it } from 'vitest'
import { displayPair, isOutcomeNo, probColor, probText } from './prices'

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
  it('probText: un mercado sin resolver nunca enseña 0% ni 100%', () => {
    expect(probText(0.4)).toBe('<1%')
    expect(probText(0.6)).toBe('1%')
    expect(probText(99.4, 'open')).toBe('99%')
    expect(probText(99.6, 'pending_resolution')).toBe('>99%')
    expect(probText(100 - displayPair(0.2).yes)).toBe('>99%')   // el No de un Sí de 0
    expect(probText(0, 'resolved_no')).toBe('0%')
    expect(probText(100, 'resolved')).toBe('100%')
    expect(probText(0, 'cancelled')).toBe('0%')
    expect(probText(0.04, 'open', 1)).toBe('<0.1%')
    expect(probText(99.96, undefined, 1)).toBe('>99.9%')
    expect(probText(37.25, undefined, 1)).toBe('37.3%')
    expect(probText(0.3, 'open', 0, '¢')).toBe('<1¢')
    expect(probText(100 - displayPair(0.3).yes, 'open', 0, '¢')).toBe('>99¢')
    expect(probText(42, 'open', 0, '¢')).toBe('42¢')
  })
})
