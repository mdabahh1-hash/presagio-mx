import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MarketCard } from './MarketCard'
import { makeMarket, MULTI_OUTCOMES } from '../test/market'

const multi = makeMarket({ marketType: 'multi', yesPrice: 0, outcomes: MULTI_OUTCOMES })
const renderCard = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('MarketCard quickLayout="chips"', () => {
  it('multi: cada fila dispara Sí/No con su outcome_key y no navega', () => {
    const onQuickTrade = vi.fn()
    renderCard(<MarketCard market={multi} onQuickTrade={onQuickTrade} quickLayout="chips" />)
    const fila = screen.getByText('Recorte de 25 pb').parentElement!
    expect(within(fila).getByText('62%')).toBeTruthy()
    const [si, no] = within(fila).getAllByRole('button')
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true })
    si.dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(true)
    fireEvent.click(no)
    fireEvent.click(within(screen.getByText('Sin cambio').parentElement!).getAllByRole('button')[1])
    expect(onQuickTrade.mock.calls).toEqual([['YES', 'recorte'], ['NO', 'recorte'], ['NO', 'sin_cambio']])
    // Dos filas + "+2 más"
    expect(screen.queryByText('Alza')).toBeNull()
    expect(screen.getAllByRole('button')).toHaveLength(4)
  })

  it('binaria: medidor con el % y botones Sí/No', () => {
    const onQuickTrade = vi.fn()
    renderCard(<MarketCard market={makeMarket({ yesPrice: 43 })} onQuickTrade={onQuickTrade} quickLayout="chips" />)
    expect(screen.getByText('43%')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Sí' }))
    fireEvent.click(screen.getByRole('button', { name: 'No' }))
    expect(onQuickTrade.mock.calls).toEqual([['YES'], ['NO']])
  })

  it('pendiente de resolución: sin compra', () => {
    renderCard(<MarketCard market={makeMarket({ status: 'pending_resolution' })} onQuickTrade={vi.fn()} quickLayout="chips" />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})

describe('MarketCard sin quickLayout (Home móvil y grids) no cambia', () => {
  it('onQuickTrade sin chips: multi con un solo botón de % que compra Sí', () => {
    const onQuickTrade = vi.fn()
    renderCard(<MarketCard market={multi} onQuickTrade={onQuickTrade} />)
    fireEvent.click(screen.getByRole('button', { name: '62%' }))
    expect(onQuickTrade).toHaveBeenCalledWith('YES', 'recorte')
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it('onQuickTrade sin chips: binaria con Sí X% / No Y%', () => {
    renderCard(<MarketCard market={makeMarket({ yesPrice: 43 })} onQuickTrade={vi.fn()} />)
    expect(screen.getAllByRole('button').map(b => b.textContent)).toEqual(['Sí 43%', 'No 57%'])
  })

  it('sin onQuickTrade: sin botones', () => {
    renderCard(<MarketCard market={multi} />)
    renderCard(<MarketCard market={makeMarket()} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})
