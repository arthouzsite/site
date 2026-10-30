// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AnchorHTMLAttributes } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HeaderClient } from '@/components/site/HeaderClient'
import { APP_ROOT_ID } from '@/lib/dom'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

function renderHeader() {
  const user = userEvent.setup()
  render(
    <div id={APP_ROOT_ID}>
      <HeaderClient />
    </div>,
  )
  return { user, root: document.getElementById(APP_ROOT_ID) }
}

afterEach(cleanup)

describe('header overlays', () => {
  it('traps focus in the mobile menu, locks the page and returns focus to Menu on Escape', async () => {
    // Arrange
    const { user, root } = renderHeader()
    const menuButton = screen.getByRole('button', { name: 'Menu' })

    // Act: open
    await user.click(menuButton)
    const dialog = screen.getByRole('dialog', { name: 'Menu' })
    const close = screen.getByRole('button', { name: 'Close' })
    const links = dialog.querySelectorAll('a')
    const lastLink = links[links.length - 1]

    // Assert: open state
    expect(document.activeElement).toBe(close)
    expect(root?.hasAttribute('inert')).toBe(true)
    expect(document.documentElement.style.overflow).toBe('hidden')

    // Act + assert: Shift+Tab from the first control wraps to the last, Tab wraps back
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(lastLink)
    await user.tab()
    expect(document.activeElement).toBe(close)

    // Act + assert: Escape closes and restores everything
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(menuButton)
    expect(root?.hasAttribute('inert')).toBe(false)
    expect(document.documentElement.style.overflow).toBe('')
  })

  it('focuses the search input and returns focus to the Search button on Close', async () => {
    const { user } = renderHeader()
    const [desktopSearch] = screen.getAllByRole('button', { name: 'Search' })
    if (!desktopSearch) throw new Error('search button missing')

    await user.click(desktopSearch)
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Search artists, exhibitions, news' }))
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }))

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(desktopSearch)
  })
})
