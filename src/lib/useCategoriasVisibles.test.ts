import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { CATEGORIES, LANDINGS_PROPIAS } from './categories'

// Caché a nivel de módulo: cada test importa el módulo limpio
const mockCategorias = vi.fn()
vi.mock('./api', () => ({ marketsApi: { categorias: () => mockCategorias() } }))

async function fresh() {
  vi.resetModules()
  return await import('./useCategoriasVisibles')
}
const flush = () => act(async () => {})
const sinGenericas = CATEGORIES.filter(c => LANDINGS_PROPIAS.includes(c))

describe('useCategoriasVisibles', () => {
  let now = 1_000_000
  beforeEach(() => { now = 1_000_000; vi.spyOn(Date, 'now').mockImplementation(() => now); mockCategorias.mockReset() })
  afterEach(() => vi.restoreAllMocks())

  it('oculta las genéricas sin activos; las de landing propia nunca', async () => {
    mockCategorias.mockResolvedValue([{ categoria: 'Tech', activos: 2 }])
    const { useCategoriasVisibles } = await fresh()
    const { result } = renderHook(useCategoriasVisibles)
    expect(result.current).toEqual(CATEGORIES)  // antes de la respuesta: todas
    await flush()
    expect(result.current).toEqual(CATEGORIES.filter(c => LANDINGS_PROPIAS.includes(c) || c === 'Tech'))
  })

  it('fallo (404 por backend viejo, respuesta rara): todas visibles y sin cachear', async () => {
    mockCategorias.mockRejectedValueOnce(new Error('404')).mockResolvedValueOnce({ detail: 'x' }).mockResolvedValue([])
    const { useCategoriasVisibles } = await fresh()
    const a = renderHook(useCategoriasVisibles); await flush()
    expect(a.result.current).toEqual(CATEGORIES)
    const b = renderHook(useCategoriasVisibles); await flush()
    expect(b.result.current).toEqual(CATEGORIES)
    const c = renderHook(useCategoriasVisibles); await flush()
    expect(c.result.current).toEqual(sinGenericas)
    expect(mockCategorias).toHaveBeenCalledTimes(3)
  })

  it('dentro del TTL no vuelve a pedir; pasado el TTL revalida mostrando el valor viejo', async () => {
    mockCategorias.mockResolvedValue([{ categoria: 'Tech', activos: 1 }])
    const { useCategoriasVisibles, CATEGORIAS_TTL_MS } = await fresh()
    renderHook(useCategoriasVisibles); await flush()
    now += CATEGORIAS_TTL_MS - 1
    const b = renderHook(useCategoriasVisibles); await flush()
    expect(mockCategorias).toHaveBeenCalledTimes(1)
    expect(b.result.current).toContain('Tech')

    now += 2
    let resolve!: (v: unknown) => void
    mockCategorias.mockReturnValue(new Promise(r => { resolve = r }))
    const c = renderHook(useCategoriasVisibles); await flush()
    expect(mockCategorias).toHaveBeenCalledTimes(2)
    expect(c.result.current).toContain('Tech')  // valor viejo mientras llega
    await act(async () => { resolve([{ categoria: 'Clima', activos: 1 }]) })
    expect(c.result.current).toContain('Clima')
    expect(c.result.current).not.toContain('Tech')
  })
})
