import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider, useToast } from './toast'

function Trigger() {
  const toast = useToast()
  return (
    <>
      <button onClick={() => toast.success('Saved')}>ok</button>
      <button onClick={() => toast.error('Failed')}>bad</button>
    </>
  )
}

afterEach(() => vi.useRealTimers())

describe('toast', () => {
  it('announces via role=status and auto-dismisses after 4s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(<ToastProvider><Trigger /></ToastProvider>)
    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(screen.getByText('ok'))
    expect(screen.getByRole('status')).toHaveTextContent('Saved')
    act(() => { vi.advanceTimersByTime(4100) })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows error toasts and throws outside the provider', async () => {
    render(<ToastProvider><Trigger /></ToastProvider>)
    await userEvent.click(screen.getByText('bad'))
    expect(screen.getByRole('status')).toHaveTextContent('Failed')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => render(<Trigger />)).toThrow('useToast must be used inside ToastProvider')
    spy.mockRestore()
  })
})
