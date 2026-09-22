import { describe, expect, it } from 'vitest'
import type { Category, Market, MarketStatus } from '../types'
import { temasPopulares } from './PopularTopics'

let n = 0
const m = (category: Category, subcategory: string | null, volume = 0, status: MarketStatus = 'open') =>
  ({ id: `m${n++}`, category, subcategory, volume, status }) as Market
const varios = (k: number, category: Category, sub: string, volume = 0) =>
  Array.from({ length: k }, () => m(category, sub, volume))

describe('temasPopulares', () => {
  it('cuenta solo abiertos y exige 2 o más', () => {
    const temas = temasPopulares([
      m('Política', 'Sheinbaum'), m('Política', 'Sheinbaum', 0, 'pending_resolution'),
      ...varios(2, 'Política', 'Elecciones'),
    ])
    expect(temas.map(t => t.sub)).toEqual(['Elecciones'])
  })

  it('ignora subcategorías que la categoría no declara', () => {
    expect(temasPopulares([...varios(3, 'Global', 'Inventada'), m('Global', null), m('Global', null)])).toEqual([])
  })

  it('ordena por abiertos, desempata por volumen y luego por nombre', () => {
    const temas = temasPopulares([
      ...varios(3, 'Global', 'Europa'),
      ...varios(3, 'Crypto', 'Solana', 10),
      ...varios(3, 'Crypto', 'Ethereum', 10),
      ...varios(4, 'Deportes', 'NFL'),
    ])
    expect(temas.map(t => [t.sub, t.abiertos])).toEqual([['NFL', 4], ['Ethereum', 3], ['Solana', 3], ['Europa', 3]])
  })

  it('máximo 2 por categoría y 6 en total', () => {
    const temas = temasPopulares([
      ...varios(9, 'Crypto', 'Bitcoin'), ...varios(8, 'Crypto', 'Solana'), ...varios(7, 'Crypto', 'Ethereum'),
      ...varios(5, 'Global', 'Europa'), ...varios(5, 'Global', 'Trump'),
      ...varios(4, 'Deportes', 'NFL'), ...varios(3, 'Deportes', 'Liga MX'),
      ...varios(2, 'Tech', 'IA'),
    ])
    expect(temas.map(t => t.sub)).toEqual(['Bitcoin', 'Solana', 'Europa', 'Trump', 'NFL', 'Liga MX'])
  })
})
