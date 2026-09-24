import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { CategoryLanding } from './CategoryLanding'
import { makeMarket, MULTI_OUTCOMES } from '../../test/market'
import { CATEGORIES, LANDINGS_PROPIAS, SUBCATEGORIES, usaLandingGenerica } from '../../lib/categories'
import type { Market } from '../../types'

// BetBox real pide sesión y cotizaciones: aquí solo importa con qué lo abre la landing.
vi.mock('../BetBox', () => ({
  BetBox: (p: { marketId: string; initialSide?: string; selectedOutcomeKey?: string | null }) => (
    <div data-testid="betbox" data-market={p.marketId} data-side={p.initialSide} data-outcome={p.selectedOutcomeKey ?? ''} />
  ),
}))

// jsdom no implementa scrollTo (abrir/cerrar el panel sube la página)
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo

const SUBS = SUBCATEGORIES['Economía'] ?? []
const MARKETS: Market[] = [
  makeMarket({ id: 'b1', subcategory: 'Tasas Banxico', trending: true, volume: 3000 }),
  makeMarket({ id: 'b2', subcategory: 'Tasas Banxico', marketType: 'multi', yesPrice: 0, outcomes: MULTI_OUTCOMES, volume: 1000 }),
  makeMarket({ id: 'f1', subcategory: 'Fed / tasas EE.UU.', volume: 500 }),
  makeMarket({ id: 'x1', subcategory: null, volume: 10 }),
  makeMarket({ id: 'otra', category: 'Crypto', subcategory: 'Bitcoin', trending: true }),
  makeMarket({ id: 't1', category: 'Tech', volume: 20 }),
]

function renderLanding(over: Partial<React.ComponentProps<typeof CategoryLanding>> = {}) {
  const props = {
    category: 'Economía' as const, markets: MARKETS, loading: false, subcats: SUBS, activeSub: null, onSubChange: vi.fn(),
    sort: 'all' as const, onSortChange: vi.fn(), onTraded: vi.fn(), ...over,
  }
  render(<MemoryRouter><CategoryLanding {...props} /></MemoryRouter>)
}

const rail = (name = 'Economía') => screen.getByRole('navigation', { name })
const railCounts = () => within(rail()).getAllByRole('button').map(b => b.textContent)

describe('usaLandingGenerica', () => {
  it('toda categoría menos las de landing propia; nada fuera de CATEGORIES', () => {
    expect(CATEGORIES.filter(usaLandingGenerica)).toEqual(CATEGORIES.filter(c => !LANDINGS_PROPIAS.includes(c)))
    expect(LANDINGS_PROPIAS.some(usaLandingGenerica)).toBe(false)
    expect(usaLandingGenerica('Basura')).toBe(false)
    expect(usaLandingGenerica('Todos')).toBe(false)
  })
})

describe('CategoryLanding', () => {
  it('rail: conteos derivados de markets, en orden de categories.ts y sin subcategorías vacías', () => {
    renderLanding()
    expect(railCounts()).toEqual(['Todos4', 'Tasas Banxico2', 'Fed / tasas EE.UU.1'])
  })

  it('pinta la categoría de la prop, sin exigir trending ni subcategorías', () => {
    renderLanding({ category: 'Tech', subcats: [] })
    expect(within(rail('Tech')).getAllByRole('button').map(b => b.textContent)).toEqual(['Todos1'])
    expect(screen.getAllByRole('link').map(a => a.getAttribute('href'))).toEqual(['/mercado/t1'])
  })

  it('categoría sin mercados: estado vacío con «Ver todos» a /mercados', () => {
    renderLanding({ category: 'Clima', subcats: [] })
    expect(screen.getByText('No hay mercados abiertos en Clima')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Ver todos' }).getAttribute('href')).toBe('/mercados')
  })

  it('con activeSub filtra el grid; clic en la activa limpia y en otra la elige', () => {
    const onSubChange = vi.fn()
    renderLanding({ activeSub: 'Tasas Banxico', onSubChange })
    expect(screen.getAllByRole('link').map(a => a.getAttribute('href'))).toEqual(['/mercado/b1', '/mercado/b2'])
    fireEvent.click(within(rail()).getByText('Tasas Banxico'))
    fireEvent.click(within(rail()).getByText('Fed / tasas EE.UU.'))
    expect(onSubChange.mock.calls).toEqual([[null], ['Fed / tasas EE.UU.']])
  })

  it('un chip No de una opción abre el sheet con ese outcome_key y no navega', () => {
    renderLanding({ activeSub: 'Tasas Banxico' })
    const fila = screen.getByText('Sin cambio').parentElement!
    fireEvent.click(within(fila).getByRole('button', { name: 'No' }))
    const box = screen.getByTestId('betbox')
    expect([box.dataset.market, box.dataset.side, box.dataset.outcome]).toEqual(['b2', 'NO', 'sin_cambio'])
  })

  it('orden de cliente: Mayor volumen', () => {
    const onSortChange = vi.fn()
    renderLanding({ sort: 'volume', onSortChange })
    expect(screen.getAllByRole('link').map(a => a.getAttribute('href'))).toEqual(['/mercado/b1', '/mercado/b2', '/mercado/f1', '/mercado/x1'])
    fireEvent.click(screen.getByRole('button', { name: 'Cierra pronto' }))
    expect(onSortChange).toHaveBeenCalledWith('ending')
  })
})

// ?sub= de punta a punta: Markets.tsx escribe y limpia la URL (sin recargar)
vi.mock('../../lib/api', async orig => {
  const mod = await orig<typeof import('../../lib/api')>()
  const api = (m: Market) => ({
    id: m.id, question: m.question, description: '', category: m.category, subcategory: m.subcategory,
    yes_price: m.yesPrice, volume: m.volume, ends_at: m.endsAt, created_at: m.endsAt, trending: m.trending,
    status: m.status, market_type: m.marketType, outcomes: m.outcomes ?? [], num_trades: 0,
  })
  const listAll = vi.fn(async (params?: { category?: string }) => MARKETS.filter(m => m.category === params?.category).map(api))
  return { ...mod, marketsApi: { ...mod.marketsApi, listAll, categorias: vi.fn(async () => []) } }
})

async function renderMarkets(url: string) {
  const { Markets } = await import('../../pages/Markets')
  let search = ''
  function Spy() { search = decodeURIComponent(useLocation().search); return null }
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes><Route path="/mercados" element={<><Markets /><Spy /></>} /></Routes>
    </MemoryRouter>,
  )
  return () => search
}

describe('CategoryLanding feature', () => {
  it('va primero en «Todos» y desaparece con una subcategoría', () => {
    renderLanding({ feature: <div data-testid="feature" /> })
    expect(screen.getByTestId('feature').parentElement!.firstElementChild).toBe(screen.getByTestId('feature'))
  })
  it('no se pinta con activeSub', () => {
    renderLanding({ feature: <div data-testid="feature" />, activeSub: 'Tasas Banxico' })
    expect(screen.queryByTestId('feature')).toBeNull()
  })
})

describe('Markets ?cat=', () => {
  it('?sub= filtra, pinta la miga y el clic en la activa la limpia de la URL', async () => {
    const search = await renderMarkets('/mercados?cat=Economía&sub=Tasas Banxico')
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Tasas Banxico'))
    expect(screen.getByRole('navigation', { name: 'breadcrumb' }).textContent).toContain('Economía')
    expect(screen.getAllByRole('link').filter(a => a.getAttribute('href')?.startsWith('/mercado/')).length).toBe(2)
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Economía' })).getByText('Tasas Banxico'))
    await waitFor(() => expect(search()).toBe('?cat=Economía'))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Economía')
  })

  it('cualquier categoría sin landing propia monta la genérica, sin trending', async () => {
    await renderMarkets('/mercados?cat=Tech')
    await waitFor(() => expect(screen.getByRole('navigation', { name: 'Tech' })).toBeTruthy())
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Tech')
  })

  it('Crypto abre con el grid y la tarjeta panel primero; el panel monta la landing y «volver» limpia la URL', async () => {
    const search = await renderMarkets('/mercados?cat=Crypto&sort=volume')
    const panel = await screen.findByRole('button', { name: /Ver panel/ })
    const grid = panel.closest('.market-grid')!
    expect(grid.firstElementChild).toBe(panel)
    expect(screen.getByRole('navigation', { name: 'Crypto' })).toBeTruthy()
    fireEvent.click(panel)
    await waitFor(() => expect(search()).toBe('?cat=Crypto&vista=panel'))
    expect(screen.queryByRole('button', { name: /Ver panel/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Todos los mercados de Crypto/ }))
    await waitFor(() => expect(search()).toBe('?cat=Crypto'))
    expect(await screen.findByRole('button', { name: /Ver panel/ })).toBeTruthy()
  })

  it('?cat= inexistente: ni landing ni mocks, solo el grid vacío', async () => {
    const { marketsApi } = await import('../../lib/api')
    await renderMarkets('/mercados?cat=Basura')
    await waitFor(() => expect(screen.getByText('0 resultados')).toBeTruthy())
    expect(screen.queryByRole('navigation', { name: 'Basura' })).toBeNull()
    expect(marketsApi.listAll).not.toHaveBeenCalledWith(expect.objectContaining({ category: 'Basura' }))
  })
})
