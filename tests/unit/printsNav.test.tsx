// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AnchorHTMLAttributes } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HeaderNav } from '@/components/site/HeaderNav'
import { MobileMenu } from '@/components/site/MobileMenu'
import type { NavChild } from '@/lib/nav'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const PRINTS: NavChild[] = [
  { slug: 'etchings', title: 'Etchings' },
  { slug: 'limited-editions', title: 'Limited editions' },
]

afterEach(cleanup)

describe('Prints in the header (FIN-3645)', () => {
  it('sits between Services and About and lists the categories in its dropdown', async () => {
    render(<HeaderNav pathname="/" services={[]} prints={PRINTS} onSearch={vi.fn()} />)
    const labels = within(screen.getByRole('navigation', { name: 'Main' })).getAllByRole('link').map((link) => link.textContent)
    expect(labels.slice(labels.indexOf('Services'), labels.indexOf('About') + 1)).toEqual(['Services', 'Prints', 'About'])
    const trigger = screen.getByRole('link', { name: 'Prints' })
    expect(trigger.getAttribute('href')).toBe('/prints')
    const panel = document.getElementById(trigger.getAttribute('aria-controls') ?? '')!
    expect(panel.hasAttribute('hidden')).toBe(true)
    expect(screen.getByRole('button', { name: 'Show print categories' })).toBeTruthy()
    await userEvent.hover(trigger)
    expect(panel.hasAttribute('hidden')).toBe(false)
    expect(within(panel).getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Etchings', '/prints/etchings'],
      ['Limited editions', '/prints/limited-editions'],
    ])
  })

  it('is a plain link while there are no categories, and marks the open category as current', () => {
    const { rerender } = render(<HeaderNav pathname="/" services={[]} onSearch={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Show print categories' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Prints' }).getAttribute('aria-controls')).toBeNull()
    rerender(<HeaderNav pathname="/prints/etchings" services={[]} prints={PRINTS} onSearch={vi.fn()} />)
    expect(screen.getByRole('link', { name: 'Prints' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Etchings', hidden: true }).getAttribute('aria-current')).toBe('page')
  })

  it('lists the categories under Prints in the mobile menu', () => {
    render(<MobileMenu pathname="/" services={[]} prints={PRINTS} onClose={vi.fn()} />)
    const menu = screen.getByRole('navigation', { name: 'Menu' })
    expect(within(menu).getByRole('link', { name: 'Limited editions' }).getAttribute('href')).toBe('/prints/limited-editions')
  })
})
