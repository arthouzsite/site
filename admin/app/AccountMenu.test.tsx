import { fireEvent, render, screen } from '@testing-library/react'
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
    expect(screen.getByRole('menu', { name: 'Priya Raman' })).toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('p@x.com')).toBeInTheDocument()
    expect(screen.getByText('Editor')).toBeInTheDocument()
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

  it('offers admins a Users link that navigates, closes the menu and keeps focus on the avatar', async () => {
    const { trigger } = mount(admin)
    await userEvent.click(trigger)
    await userEvent.click(screen.getByRole('menuitem', { name: 'Users' }))
    expect(screen.getByTestId('where')).toHaveTextContent('/users')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('toggles closed on a second avatar click, including when a list item holds focus', async () => {
    const { trigger } = mount(admin)
    await userEvent.click(trigger)
    await userEvent.click(trigger)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    trigger.focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Users' })).toHaveFocus()
    // Safari drops focus to body on mousedown, then fires the click.
    fireEvent.blur(screen.getByRole('menuitem', { name: 'Users' }), { relatedTarget: null })
    expect(screen.getByRole('menu')).toBeInTheDocument()
    fireEvent.click(trigger)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('opens with Space, Enter and ArrowUp (onto the last item), and Home jumps back to the first', async () => {
    const { trigger } = mount(admin)
    trigger.focus()
    await userEvent.keyboard(' ')
    expect(screen.getByRole('menuitem', { name: 'Users' })).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('menuitem', { name: 'Users' })).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    await userEvent.keyboard('{ArrowUp}')
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toHaveFocus()
    await userEvent.keyboard('{ArrowUp}')
    expect(screen.getByRole('menuitem', { name: 'Users' })).toHaveFocus()
    await userEvent.keyboard('{End}{Home}')
    expect(screen.getByRole('menuitem', { name: 'Users' })).toHaveFocus()
  })

  it('does not fire Sign out from the Space keyup that follows opening', async () => {
    const { trigger, onLogout } = mount(editor)
    trigger.focus()
    await userEvent.keyboard(' ')
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toHaveFocus()
    expect(onLogout).not.toHaveBeenCalled()
    expect(fireEvent.keyUp(trigger, { key: ' ' })).toBe(false)
  })

  it('closes on Tab and Shift+Tab from inside the list', async () => {
    const { trigger } = mount(admin)
    trigger.focus()
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.tab({ shift: true })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.tab()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('keeps the menu open when the window loses focus', async () => {
    const { trigger } = mount(editor)
    await userEvent.click(trigger)
    fireEvent.blur(trigger, { relatedTarget: null })
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('keeps the identity block outside the menu role so it is readable in browse mode', async () => {
    const { trigger } = mount(editor)
    await userEvent.click(trigger)
    const menu = screen.getByRole('menu', { name: 'Priya Raman' })
    expect(menu).not.toHaveTextContent('p@x.com')
    expect(screen.getByText('p@x.com')).toBeInTheDocument()
    expect(screen.getByText('Editor')).toBeInTheDocument()
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
