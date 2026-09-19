import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QuickTradeSheet } from './QuickTradeSheet'
import { makeMarket, MULTI_OUTCOMES } from '../test/market'

vi.mock('../lib/AuthContext', () => ({ useAuth: () => ({ user: null, refreshUser: vi.fn() }) }))
vi.mock('../lib/api', async orig => {
  const mod = await orig<typeof import('../lib/api')>()
  return { ...mod, marketsApi: { ...mod.marketsApi, quote: vi.fn(() => new Promise(() => {})) } }
})

const multi = makeMarket({ id: 'nfl-dpoy-2026', marketType: 'multi', yesPrice: 0, outcomes: MULTI_OUTCOMES })
const buy = () => screen.getAllByRole('button', { hidden: true }).find(b => /^Comprar/.test(b.textContent ?? ''))!

describe('QuickTradeSheet sin sesión', () => {
  it('el acceso entra en la misma hoja, la compra sigue montada y «Volver» la devuelve intacta', () => {
    const onClose = vi.fn()
    const { container } = render(
      <MemoryRouter>
        <QuickTradeSheet market={multi} side="NO" betKey="k" outcomeKey="sin_cambio" onOutcomeChange={() => {}} onClose={onClose} onTraded={() => {}} />
      </MemoryRouter>,
    )
    fireEvent.change(container.querySelector('input')!, { target: { value: '250' } })
    expect(buy().textContent).toBe('Comprar No · 250 PT')
    fireEvent.click(buy())

    // Una sola superficie: ni se cerró la hoja ni apareció un modal encima
    expect(onClose).not.toHaveBeenCalled()
    expect(container.querySelectorAll('.sheet-overlay')).toHaveLength(1)
    expect(document.querySelector('.modal-overlay')).toBeNull()
    expect(screen.getByText('Crear cuenta', { selector: 'div' })).toBeTruthy()
    // La compra queda oculta, no desmontada
    expect(buy().closest('[hidden]')).toBeTruthy()

    // Google vuelve al detalle con lo elegido
    const google = container.querySelector('a[aria-label*="Google"]')!.getAttribute('href')!
    expect(decodeURIComponent(google.split('next=')[1])).toBe('/mercado/nfl-dpoy-2026?side=NO&monto=250&outcome=sin_cambio')

    fireEvent.click(screen.getByRole('button', { name: 'Volver a la compra' }))
    expect(buy().closest('[hidden]')).toBeNull()
    expect(buy().textContent).toBe('Comprar No · 250 PT')
  })
})
