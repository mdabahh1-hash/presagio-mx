import { describe, it, expect } from 'vitest'
import { orderOutcomes, is1x2 } from './outcomeOrder'

const o = (outcome_key: string, price: number) => ({ outcome_key, label: outcome_key, price })
const keys = (xs: { outcome_key: string }[]) => xs.map(x => x.outcome_key)

describe('orderOutcomes', () => {
  it('1X2: local → empate → visitante aunque la API lo mande por precio', () => {
    expect(keys(orderOutcomes([o('visitante', 52), o('local', 25), o('empate', 23)]))).toEqual(['local', 'empate', 'visitante'])
  })

  it('otros multi: por probabilidad de mayor a menor', () => {
    expect(keys(orderOutcomes([o('dolphins', 40), o('49ers', 60)]))).toEqual(['49ers', 'dolphins'])
    expect(keys(orderOutcomes([o('otro', 10), o('watt', 30), o('bonitto', 20)]))).toEqual(['watt', 'bonitto', 'otro'])
  })

  it('1X2 con una key extra deja de ser 1X2: por probabilidad', () => {
    expect(keys(orderOutcomes([o('local', 10), o('empate', 20), o('visitante', 30), o('otro', 40)]))).toEqual(['otro', 'visitante', 'empate', 'local'])
  })

  it('is1x2: solo con las tres keys exactas', () => {
    expect(is1x2([o('visitante', 52), o('local', 25), o('empate', 23)])).toBe(true)
    expect(is1x2([o('dolphins', 40), o('49ers', 60)])).toBe(false)
    expect(is1x2([o('local', 10), o('empate', 20), o('visitante', 30), o('otro', 40)])).toBe(false)
  })

  it('no muta la entrada', () => {
    const input = [o('visitante', 52), o('local', 25), o('empate', 23)]
    orderOutcomes(input)
    expect(keys(input)).toEqual(['visitante', 'local', 'empate'])
  })
})
