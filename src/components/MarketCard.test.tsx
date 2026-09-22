import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MarketCard } from './MarketCard'
import { makeMarket, MULTI_OUTCOMES } from '../test/market'

const multi = makeMarket({ marketType: 'multi', yesPrice: 0, outcomes: MULTI_OUTCOMES })
const renderCard = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>)

// 1X2 tal como lo manda la API: por precio, con emoji en las etiquetas
const partido = makeMarket({
  id: 'laliga-sevilla-barcelona-sep26', kind: 'partido', marketType: 'multi', yesPrice: 0, subcategory: 'LaLiga',
  outcomes: [
    { outcome_key: 'visitante', label: '✈️ Barcelona', price: 47 },
    { outcome_key: 'local', label: '🏠 Sevilla', price: 30 },
    { outcome_key: 'empate', label: '🤝 Empate', price: 24 },
  ],
})
const teams = (c: HTMLElement) => [...c.querySelectorAll('.market-card-team-name')].map(n => n.textContent)

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
    // Dos filas + "+2 más"
    expect(screen.queryByText('Alza')).toBeNull()
    expect(screen.getAllByRole('button')).toHaveLength(4)
  })

  it('1X2 sin kind partido: sigue el orden local → empate → visitante', () => {
    const outcomes = [
      { outcome_key: 'visitante', label: 'Barcelona', price: 52 },
      { outcome_key: 'local', label: 'Sevilla', price: 25 },
      { outcome_key: 'empate', label: 'Empate', price: 23 },
    ]
    const { container } = renderCard(<MarketCard market={makeMarket({ marketType: 'multi', yesPrice: 0, outcomes })} onQuickTrade={vi.fn()} />)
    const filas = [...container.querySelectorAll('.market-card-row')]
    expect(filas.map(r => r.querySelector('span[title]')!.textContent)).toEqual(['Sevilla', 'Empate'])
    // El Empate lleva su marca neutral (ni número ni hueco vacío); los equipos, no
    expect(filas.map(r => !!r.querySelector('svg'))).toEqual([false, true])
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

describe('MarketCard de partido', () => {
  it('1X2: filas local → visitante (sin pregunta ni emoji) y tres botones', () => {
    const onQuickTrade = vi.fn()
    const { container } = renderCard(<MarketCard market={partido} onQuickTrade={onQuickTrade} />)
    expect(teams(container)).toEqual(['Sevilla', 'Barcelona'])
    expect(screen.queryByText(partido.question)).toBeNull()
    expect(container.querySelector('.market-card')!.getAttribute('title')).toBe(partido.question)
    expect(screen.getByText('LaLiga')).toBeTruthy()
    const botones = screen.getAllByRole('button')
    expect(botones.map(b => b.textContent)).toEqual(['Sevilla', 'Empate', 'Barcelona'])
    botones.forEach(b => fireEvent.click(b))
    expect(onQuickTrade.mock.calls).toEqual([['YES', 'local'], ['YES', 'empate'], ['YES', 'visitante']])
  })

  it('dos equipos: el local es el del id y el color lo manda el favorito, como en el detalle', () => {
    // nfl-broncos-jaguars: el visitante (Jaguars) es favorito, así que en el detalle
    // es la primera línea de la gráfica; en la tarjeta va abajo pero con ese color.
    const nfl = makeMarket({
      id: 'nfl-broncos-jaguars-s2-2026', kind: 'partido', marketType: 'multi', yesPrice: 0, subcategory: 'NFL',
      outcomes: [{ outcome_key: 'jaguars', label: 'Jaguars', price: 53 }, { outcome_key: 'broncos', label: 'Broncos', price: 47 }],
    })
    const { container } = renderCard(<MarketCard market={nfl} onQuickTrade={vi.fn()} />)
    expect(teams(container)).toEqual(['Broncos', 'Jaguars'])
    const botones = screen.getAllByRole('button')
    expect(botones.map(b => b.textContent)).toEqual(['Broncos', 'Jaguars'])
    expect(botones.map(b => b.style.color)).toEqual(['var(--chart-2)', 'var(--chart-1)'])
  })

  it('pendiente: mismas filas de equipos, sin botones', () => {
    const { container } = renderCard(<MarketCard market={{ ...partido, status: 'pending_resolution' }} onQuickTrade={vi.fn()} />)
    expect(teams(container)).toEqual(['Sevilla', 'Barcelona'])
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})
