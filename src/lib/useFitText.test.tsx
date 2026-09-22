import { describe, it, expect, beforeAll } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { useFitText, ESCALONES } from './useFitText'

// jsdom no maquetea texto: se simula el alto del contenido por tamaño de letra y
// el alto de la caja (la cabecera de la tarjeta).
let ALTO_CAJA = 72
let ALTO_TEXTO: Record<number, number> = {}

beforeAll(() => {
  Object.defineProperty(HTMLDivElement.prototype, 'clientHeight', { get: () => ALTO_CAJA, configurable: true })
  Object.defineProperty(HTMLParagraphElement.prototype, 'scrollHeight', {
    get(this: HTMLParagraphElement) { return ALTO_TEXTO[parseFloat(this.style.fontSize) || 15] ?? 0 },
    configurable: true,
  })
})

function Tarjeta({ texto }: { texto: string }) {
  const ref = useFitText<HTMLParagraphElement>(texto, ESCALONES)
  return <div><p ref={ref}>{texto}</p></div>
}

const pintar = async (texto: string) => {
  const { container } = render(<Tarjeta texto={texto} />)
  const p = container.querySelector('p')!
  await waitFor(() => expect(p.style.fontSize).not.toBe(''))
  return p
}

describe('useFitText', () => {
  it('se queda en 15 px si el título cabe en las 3 líneas de esa medida', async () => {
    ALTO_CAJA = 72
    ALTO_TEXTO = { 15: 60, 14: 54, 13: 47 }   // 60 <= 3 × 20.25
    const p = await pintar('título corto')
    expect(p.style.fontSize).toBe('15px')
    expect(p.style.webkitLineClamp).toBe('3')
    expect(p.style.height).toBe('60.75px')
  })

  it('baja a 14 px cuando a 15 no cabe', async () => {
    ALTO_CAJA = 72
    ALTO_TEXTO = { 15: 81, 14: 54, 13: 47 }   // 81 > 60.75; 54 <= 3 × 18.2
    const p = await pintar('título medio')
    expect(p.style.fontSize).toBe('14px')
    expect(p.style.webkitLineClamp).toBe('3')
  })

  it('llega a 13 px y ahí puede usar 4 líneas', async () => {
    ALTO_CAJA = 72
    ALTO_TEXTO = { 15: 101, 14: 91, 13: 62 }  // 62 <= 4 × 15.6
    const p = await pintar('título largo')
    expect(p.style.fontSize).toBe('13px')
    expect(p.style.webkitLineClamp).toBe('4')
    expect(p.style.height).toBe('62.4px')
  })

  it('si ni a 13 px cabe, se queda en 13 con «…» (nunca baja del mínimo)', async () => {
    ALTO_CAJA = 72
    ALTO_TEXTO = { 15: 200, 14: 180, 13: 160 }
    const p = await pintar('título larguísimo')
    expect(p.style.fontSize).toBe('13px')
    expect(p.style.webkitLineClamp).toBe('4')
  })

  it('en la caja del multi (48 px) el tope de líneas baja solo', async () => {
    ALTO_CAJA = 48
    ALTO_TEXTO = { 15: 41, 14: 37, 13: 32 }   // 41 <= 2 × 20.25
    const p = await pintar('título de multi')
    expect(p.style.fontSize).toBe('15px')
    expect(p.style.webkitLineClamp).toBe('2')
  })
})
