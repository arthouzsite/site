import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmModal } from './ConfirmModal'

const base = { title: 'Delete exhibition?', body: 'This cannot be undone.', confirmLabel: 'Delete' }

describe('ConfirmModal', () => {
  it('renders nothing while closed', () => {
    render(<ConfirmModal {...base} open={false} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('focuses Cancel, closes on Escape and confirms on click', async () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    render(<ConfirmModal {...base} open danger onConfirm={onConfirm} onCancel={onCancel} />)
    expect(screen.getByRole('alertdialog', { name: 'Delete exhibition?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('traps Tab focus inside the dialog', async () => {
    render(<ConfirmModal {...base} open onConfirm={vi.fn()} onCancel={vi.fn()} />)
    const user = userEvent.setup()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus()
  })
})
