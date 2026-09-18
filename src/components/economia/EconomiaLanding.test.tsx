import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { EconomiaLanding, economiaLandingAvailable } from './EconomiaLanding'
import { makeMarket, MULTI_OUTCOMES } from '../../test/market'
import { SUBCATEGORIES } from '../../lib/categories'
import type { Market } from '../../types'

// BetBox real pide sesión y cotizaciones: aquí solo importa con qué lo abre la landing.
vi.mock('../BetBox', () => ({
  BetBox: (p: { marketId: string; initialSide?: string; selectedOutcomeKey?: string | null }) => (
    <div data-testid="betbox" data-market={p.marketId} data-side={p.initialSide} data-outcome={p.selectedOutcomeKey ?? ''} />
  ),
}))

const SUBS = SUBCATEGORIES['Economía'] ?? []
const MARKETS: Market[] = [
  makeMarket({ id: 'b1', subcategory: 'Tasas Banxico', trending: true, volume: 3000 }),
  makeMarket({ id: 'b2', subcategory: 'Tasas Banxico', marketType: 'multi', yesPrice: 0, outcomes: MULTI_OUTCOMES, volume: 1000 }),
  makeMarket({ id: 'f1', subcategory: 'Fed / tasas EE.UU.', volume: 500 }),
  makeMarket({ id: 'x1', subcategory: null, volume: 10 }),
  makeMarket({ id: 'otra', category: 'Crypto', subcategory: 'Bitcoin', trending: true }),
]

function renderLanding(over: Partial<React.ComponentProps<typeof EconomiaLanding>> = {}) {
  const props = {
    markets: MARKETS, loading: false, subcats: SUBS, activeSub: null, onSubChange: vi.fn(),
    sort: 'all' as const, onSortChange: vi.fn(), onTraded: vi.fn(), ...over,
  }
  render(<MemoryRouter><EconomiaLanding {...props} /></MemoryRouter>)
}

const rail = () => screen.getByRole('navigation', { name: 'Economía' })
const railCounts = () => within(rail()).getAllByRole('button').map(b => b.textContent)

describe('economiaLandingAvailable', () => {
  it('monta con un mercado trending abierto de Economía, o mientras carga', () => {
    expect(economiaLandingAvailable(MARKETS, false)).toBe(true)
    expect(economiaLandingAvailable([], true)).toBe(true)
  })
  it('sin trending (o trending solo en otra categoría o ya cerrado) cae a CategoryBrowse', () => {
    const sinTrending = MARKETS.map(m => ({ ...m, trending: m.category !== 'Economía' }))
    expect(economiaLandingAvailable(sinTrending, false)).toBe(false)
    const cerrado = [makeMarket({ trending: true, status: 'pending_resolution' })]
    expect(economiaLandingAvailable(cerrado, false)).toBe(false)
  })
})

describe('EconomiaLanding', () => {
  it('rail: conteos derivados de markets, en orden de categories.ts y sin subcategorías vacías', () => {
    renderLanding()
    expect(railCounts()).toEqual(['Todos4', 'Tasas Banxico2', 'Fed / tasas EE.UU.1'])
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
  return { ...mod, marketsApi: { ...mod.marketsApi, listAll: vi.fn(async () => MARKETS.filter(m => m.category === 'Economía').map(api)) } }
})

describe('Markets ?cat=Economía', () => {
  it('?sub= filtra, pinta la miga y el clic en la activa la limpia de la URL', async () => {
    const { Markets } = await import('../../pages/Markets')
    let search = ''
    function Spy() { search = decodeURIComponent(useLocation().search); return null }
    render(
      <MemoryRouter initialEntries={['/mercados?cat=Economía&sub=Tasas Banxico']}>
        <Routes><Route path="/mercados" element={<><Markets /><Spy /></>} /></Routes>
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Tasas Banxico'))
    expect(screen.getByRole('navigation', { name: 'breadcrumb' }).textContent).toContain('Economía')
    expect(screen.getAllByRole('link').filter(a => a.getAttribute('href')?.startsWith('/mercado/')).length).toBe(2)
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Economía' })).getByText('Tasas Banxico'))
    await waitFor(() => expect(search).toBe('?cat=Economía'))
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Economía')
  })
})
