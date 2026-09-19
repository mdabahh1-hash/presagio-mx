import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MarketCard } from './MarketCard'
import { makeMarket, MULTI_OUTCOMES } from '../test/market'

const multi = makeMarket({ marketType: 'multi', yesPrice: 0, outcomes: MULTI_OUTCOMES })
const renderCard = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('MarketCard', () => {
  it('multi: cada fila dispara Sí/No con su outcome_key y no navega', () => {
    const onQuickTrade = vi.fn()
    renderCard(<MarketCard market={multi} onQuickTrade={onQuickTrade} />)
    const fila = screen.getByText('Recorte de 25 pb').parentElement!
    expect(within(fila).getByText('62%')).toBeTruthy()
    const [si, no] = within(fila).getAllByRole('button')
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true })
    si.dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(true)
    fireEvent.click(no)
    fireEvent.click(within(screen.getByText('Sin cambio').parentElement!).getAllByRole('button')[1])
    expect(onQuickTrade.mock.calls).toEqual([['YES', 'recorte'], ['NO', 'recorte'], ['NO', 'sin_cambio']])
    // Tres filas + "+1 más"
    expect(screen.getByText('Alza')).toBeTruthy()
    expect(screen.queryByText('Recorte de 50 pb')).toBeNull()
    expect(screen.getAllByRole('button')).toHaveLength(6)
  })

  it('1X2: local → empate → visitante aunque la API lo mande por precio', () => {
    const outcomes = [
      { outcome_key: 'visitante', label: 'Barcelona', price: 52 },
      { outcome_key: 'local', label: 'Sevilla', price: 25 },
      { outcome_key: 'empate', label: 'Empate', price: 23 },
    ]
    const { container } = renderCard(<MarketCard market={makeMarket({ marketType: 'multi', yesPrice: 0, outcomes })} onQuickTrade={vi.fn()} />)
    expect([...container.querySelectorAll('.market-card-row')].map(r => r.querySelector('span[title]')!.textContent)).toEqual(['Sevilla', 'Empate', 'Barcelona'])
    // El Empate lleva su marca neutral (ni número ni hueco vacío); los equipos, no
    expect([...container.querySelectorAll('.market-card-row')].map(r => !!r.querySelector('svg'))).toEqual([false, true, false])
  })

  it('binaria: medidor con el % y botones Sí/No', () => {
    const onQuickTrade = vi.fn()
    renderCard(<MarketCard market={makeMarket({ yesPrice: 43 })} onQuickTrade={onQuickTrade} />)
    expect(screen.getByText('43%')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Sí' }))
    fireEvent.click(screen.getByRole('button', { name: 'No' }))
    expect(onQuickTrade.mock.calls).toEqual([['YES'], ['NO']])
  })

  it('título completo en el atributo title', () => {
    const market = makeMarket()
    renderCard(<MarketCard market={market} onQuickTrade={vi.fn()} />)
    expect(screen.getByText(market.question).getAttribute('title')).toBe(market.question)
  })

  it('pendiente de resolución: sin compra (la multi conserva sus filas)', () => {
    renderCard(<MarketCard market={makeMarket({ status: 'pending_resolution' })} onQuickTrade={vi.fn()} />)
    renderCard(<MarketCard market={{ ...multi, status: 'pending_resolution' }} onQuickTrade={vi.fn()} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.getByText('Recorte de 25 pb')).toBeTruthy()
  })
})
