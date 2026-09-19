import { describe, expect, it, vi, afterEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { TradeSheet, SHEET_EXIT_MS } from './TradeSheet'

afterEach(() => vi.useRealTimers())

describe('TradeSheet', () => {
  it('al cerrar conserva el último contenido durante la salida y luego se desmonta', () => {
    vi.useFakeTimers()
    const { rerender, container } = render(<TradeSheet open onClose={() => {}}><p>compra</p></TradeSheet>)
    expect(screen.getByRole('dialog')).toBeTruthy()
    // Quien lo monta deja de pasar children al cerrar
    rerender(<TradeSheet open={false} onClose={() => {}}>{null}</TradeSheet>)
    expect(container.querySelector('.sheet-overlay--out')).toBeTruthy()
    expect(screen.getByText('compra')).toBeTruthy()
    expect(document.body.style.overflow).toBe('')
    act(() => { vi.advanceTimersByTime(SHEET_EXIT_MS) })
    expect(container.querySelector('.sheet-overlay')).toBeNull()
  })

  it('reabrir durante la salida cancela el desmontaje', () => {
    vi.useFakeTimers()
    const { rerender, container } = render(<TradeSheet open onClose={() => {}}><p>a</p></TradeSheet>)
    rerender(<TradeSheet open={false} onClose={() => {}}>{null}</TradeSheet>)
    rerender(<TradeSheet open onClose={() => {}}><p>b</p></TradeSheet>)
    act(() => { vi.advanceTimersByTime(SHEET_EXIT_MS * 2) })
    expect(container.querySelector('.sheet-overlay--out')).toBeNull()
    expect(screen.getByText('b')).toBeTruthy()
  })
})
