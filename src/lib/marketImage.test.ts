import { describe, expect, it } from 'vitest'
import { marketImageSrc, marketImageSrcSet } from './marketImage'

describe('imágenes de Economía', () => {
  it('prioridad: image_url > id > subcategoría > categoría', () => {
    expect(marketImageSrc({ id: 'tmec-extension-16-anos-2026', category: 'Economía', subcategory: null })).toBe('/img/markets/economia/contenedores.jpg')
    expect(marketImageSrc({ id: 'nuevo', category: 'Economía', subcategory: 'Fed / tasas EE.UU.' })).toBe('/img/markets/economia/fed.jpg')
    expect(marketImageSrc({ id: 'nuevo', category: 'Economía', subcategory: 'Empleo / IMSS' })).toBe('/img/markets/cat/economia.svg')
    expect(marketImageSrc({ id: 'mexico-inflacion-2026', category: 'Economía', imageUrl: 'https://x.test/a.png' })).toBe('https://x.test/a.png')
  })
  it('srcSet 2x solo para las fotos locales de Economía', () => {
    expect(marketImageSrcSet('/img/markets/economia/fed.jpg')).toBe('/img/markets/economia/fed.jpg 1x, /img/markets/economia/fed@2x.jpg 2x')
    expect(marketImageSrcSet('/img/markets/cat/economia.svg')).toBeUndefined()
  })
})
