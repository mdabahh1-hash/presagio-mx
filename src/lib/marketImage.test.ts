import { describe, expect, it } from 'vitest'
import { marketImageSrc, marketImageSrcSet } from './marketImage'

describe('imágenes por tema', () => {
  it('prioridad: image_url > id > subcategoría > categoría', () => {
    expect(marketImageSrc({ id: 'tmec-extension-16-anos-2026', category: 'Economía', subcategory: null })).toBe('/img/markets/temas/contenedores.jpg')
    expect(marketImageSrc({ id: 'nuevo', category: 'Economía', subcategory: 'Fed / tasas EE.UU.' })).toBe('/img/markets/temas/fed.jpg')
    expect(marketImageSrc({ id: 'nuevo', category: 'Economía', subcategory: 'Tipo de cambio' })).toBe('/img/markets/temas/pesos.jpg')
    expect(marketImageSrc({ id: 'nuevo', category: 'Crypto', subcategory: 'Bitcoin' })).toBe('/img/markets/temas/bitcoin.jpg')
    expect(marketImageSrc({ id: 'nuevo', category: 'Economía', subcategory: 'Sin foto' })).toBe('/img/markets/cat/economia.svg')
    expect(marketImageSrc({ id: 'mexico-inflacion-2026', category: 'Economía', imageUrl: 'https://x.test/a.png' })).toBe('https://x.test/a.png')
  })
  it('srcSet 2x solo para las fotos locales de temas', () => {
    expect(marketImageSrcSet('/img/markets/temas/fed.jpg')).toBe('/img/markets/temas/fed.jpg 1x, /img/markets/temas/fed@2x.jpg 2x')
    expect(marketImageSrcSet('/img/markets/cat/economia.svg')).toBeUndefined()
  })
})
