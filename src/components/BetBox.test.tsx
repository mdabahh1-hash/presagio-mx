import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

// Textos de los botones. El Sí/No separa lado y precio con gap de CSS: su texto es «No38¢».
// (Se comparan textos, no nodos: inspeccionar un nodo de jsdom en expect cuelga a Vitest.)
const buttons = () => screen.getAllByRole('button').map(b => b.textContent)
import { BetBox } from './BetBox'
import { marketsApi } from '../lib/api'
import { MULTI_OUTCOMES } from '../test/market'

vi.mock('../lib/AuthContext', () => ({ useAuth: () => ({ user: null, refreshUser: vi.fn() }) }))
vi.mock('../lib/api', async orig => {
  const mod = await orig<typeof import('../lib/api')>()
  return { ...mod, marketsApi: { ...mod.marketsApi, quote: vi.fn(() => new Promise(() => {})) } }
})

const quote = vi.mocked(marketsApi.quote)
// Llaves a propósito: mockClear() devuelve el mock y Vitest trataría ese retorno como teardown
beforeEach(() => { quote.mockClear() })

describe('BetBox: qué se cotiza', () => {
  it('multi Sí: solo outcome_key (contrato de siempre)', async () => {
    render(<BetBox marketId="m" yesPrice={0} marketType="multi" outcomes={MULTI_OUTCOMES} selectedOutcomeKey="recorte" />)
    await waitFor(() => expect(quote).toHaveBeenCalledWith('m', { outcome_key: 'recorte', amount: 1000 }))
    expect(buttons()).toContain('Comprar Sí · 1,000 PT')
  })

  it('multi No: outcome_key + side=NO, con precio en centavos de la opción', async () => {
    render(<BetBox marketId="m" yesPrice={0} marketType="multi" outcomes={MULTI_OUTCOMES} selectedOutcomeKey="recorte" initialSide="NO" />)
    await waitFor(() => expect(quote).toHaveBeenCalledWith('m', { outcome_key: 'recorte', side: 'NO', amount: 1000 }))
    expect(buttons()).toContain('No38¢')
    expect(buttons()).toContain('Comprar No · 1,000 PT')
  })

  it('multi: cambiar de lado vuelve a cotizar y avisa al controlador', async () => {
    const onSideChange = vi.fn()
    render(<BetBox marketId="m" yesPrice={0} marketType="multi" outcomes={MULTI_OUTCOMES} selectedOutcomeKey="sin_cambio" onSideChange={onSideChange} />)
    fireEvent.click(screen.getAllByRole('button').find(b => b.textContent === 'No71¢')!)
    expect(onSideChange).toHaveBeenCalledWith('NO')
    await waitFor(() => expect(quote).toHaveBeenLastCalledWith('m', { outcome_key: 'sin_cambio', side: 'NO', amount: 1000 }))
  })

  it('binario: side sin outcome_key, precios en %', async () => {
    render(<BetBox marketId="b" yesPrice={43} initialSide="NO" />)
    await waitFor(() => expect(quote).toHaveBeenCalledWith('b', { side: 'NO', amount: 1000 }))
    expect(buttons()).toContain('No57%')
  })
})
