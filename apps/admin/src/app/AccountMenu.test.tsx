import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { SessionUser } from '../features/auth/useSession'
import { AccountMenu } from './AccountMenu'

const editor: SessionUser = { id: '1', email: 'p@x.com', name: 'Priya Raman', role: 'EDITOR' }
const admin: SessionUser = { ...editor, role: 'ADMIN' }

function Where() {
  return <output data-testid="where">{useLocation().pathname}</output>
}

function mount(user: SessionUser, onLogout = vi.fn()) {
  render(
    <MemoryRouter initialEntries={['/exhibitions']}>
      <button type="button">Outside</button>
      <AccountMenu user={user} onLogout={onLogout} />
      <Routes><Route path="*" element={<Where />} /></Routes>
    </MemoryRouter>,
  )
  return { onLogout, trigger: screen.getByRole('button', { name: /Priya Raman.*account/ }) }
}

describe('AccountMenu', () => {
  it('renders the initials as a closed menu button', () => {
    const { trigger } = mount(editor)
    expect(trigger).toHaveTextContent('PR')
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('opens on click with the identity, role and Sign out; editors get no Users item', async () => {
    const { trigger } = mount(editor)
    await userEvent.click(trigger)
    const menu = screen.getByRole('menu', { name: /Priya Raman/ })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(menu).toHaveTextContent('Priya Raman')
    expect(menu).toHaveTextContent('p@x.com')
    expect(menu).toHaveTextContent('Editor')
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Users' })).not.toBeInTheDocument()
  })

  it('does not sign out on the avatar click itself', async () => {
    const { trigger, onLogout } = mount(editor)
    await userEvent.click(trigger)
    expect(onLogout).not.toHaveBeenCalled()
  })

  it('signs out from the menu item and closes', async () => {
    const { trigger, onLogout } = mount(editor)
    await userEvent.click(trigger)
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }))
    expect(onLogout).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('offers admins a Users link that navigates and closes the menu', async () => {
    const { trigger } = mount(admin)
    await userEvent.click(trigger)
    await userEvent.click(screen.getByRole('menuitem', { name: 'Users' }))
    expect(screen.getByTestId('where')).toHaveTextContent('/users')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('opens from the keyboard onto the first item, arrows wrap, Escape returns focus to the avatar', async () => {
    const { trigger } = mount(admin)
    trigger.focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Users' })).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Users' })).toHaveFocus()
    await userEvent.keyboard('{End}')
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('closes on Escape while focus is still on the avatar after a mouse open', async () => {
    const { trigger } = mount(editor)
    await userEvent.click(trigger)
    expect(trigger).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('closes when the pointer goes down outside and when focus tabs away', async () => {
    const { trigger } = mount(editor)
    await userEvent.click(trigger)
    await userEvent.click(screen.getByRole('button', { name: 'Outside' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    await userEvent.click(trigger)
    expect(screen.getByRole('menu')).toBeInTheDocument()
    await userEvent.tab()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
