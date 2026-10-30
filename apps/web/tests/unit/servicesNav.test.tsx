// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AnchorHTMLAttributes } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HeaderClient } from '@/components/site/HeaderClient'
import { HeaderNav } from '@/components/site/HeaderNav'
import { APP_ROOT_ID } from '@/lib/dom'
import type { NavService } from '@/lib/services'

let pathname = '/'
vi.mock('next/navigation', () => ({ usePathname: () => pathname }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const SERVICES: NavService[] = [
  { slug: 'art-sales', title: 'Art sales' },
  { slug: 'art-for-rent', title: 'Art for rent' },
  { slug: 'gallery-on-rent', title: 'Gallery on rent' },
]

function renderNav(services: readonly NavService[] = SERVICES) {
  const user = userEvent.setup()
  const utils = render(
    <div id={APP_ROOT_ID}>
      <button type="button">before</button>
      <HeaderNav pathname={pathname} services={services} onSearch={vi.fn()} />
      <button type="button">after</button>
    </div>,
  )
  const trigger = screen.getByRole('link', { name: 'Services' })
  const panel = () => document.getElementById(trigger.getAttribute('aria-controls') ?? '')
  return { user, trigger, panel, ...utils }
}

afterEach(() => {
  pathname = '/'
  cleanup()
})

describe('desktop Services dropdown', () => {
  it('is a normal link to /services whose panel lists the services and starts closed', () => {
    const { trigger, panel } = renderNav()
    expect(trigger.getAttribute('href')).toBe('/services')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(panel()?.hasAttribute('hidden')).toBe(true)
    const links = within(panel()!).getAllByRole('link', { hidden: true })
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Art sales', '/services/art-sales'],
      ['Art for rent', '/services/art-for-rent'],
      ['Gallery on rent', '/services/gallery-on-rent'],
    ])
  })

  it('opens on hover and closes when the pointer leaves', async () => {
    const { user, trigger, panel } = renderNav()
    await user.hover(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(panel()?.hasAttribute('hidden')).toBe(false)
    await user.unhover(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('opens when focus enters, stays open while tabbing through the list and closes when focus leaves', async () => {
    const { user, trigger, panel } = renderNav()
    screen.getByRole('link', { name: 'News' }).focus()
    await user.tab()
    expect(document.activeElement).toBe(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    await user.tab()
    expect(document.activeElement).toBe(within(panel()!).getAllByRole('link')[0])
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    await user.tab()
    await user.tab()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'About' }))
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('moves into the list with ArrowDown and within it with the arrow keys, Home and End', async () => {
    const { user, trigger, panel } = renderNav()
    const [first, second, third] = within(panel()!).getAllByRole('link', { hidden: true })
    trigger.focus()
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(first)
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(second)
    await user.keyboard('{End}')
    expect(document.activeElement).toBe(third)
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(third)
    await user.keyboard('{Home}')
    expect(document.activeElement).toBe(first)
    await user.keyboard('{ArrowUp}')
    expect(document.activeElement).toBe(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
  })

  it('leaves Enter to the link itself', async () => {
    const { user, trigger } = renderNav()
    trigger.focus()
    const keydown = vi.fn((event: KeyboardEvent) => event.defaultPrevented)
    document.addEventListener('keydown', keydown)
    await user.keyboard('{Enter}')
    document.removeEventListener('keydown', keydown)
    expect(keydown).toHaveReturnedWith(false)
  })

  it('closes on Escape from inside the list and returns focus to the link without reopening', async () => {
    const { user, trigger, panel } = renderNav()
    trigger.focus()
    await user.keyboard('{ArrowDown}{Escape}')
    expect(document.activeElement).toBe(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(panel()?.hasAttribute('hidden')).toBe(true)
    await user.keyboard('{ArrowDown}')
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
  })

  it('closes on Escape while the link itself is focused', async () => {
    const { user, trigger } = renderNav()
    await user.hover(trigger)
    trigger.focus()
    await user.keyboard('{Escape}')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('closes on a press outside and stays open on a press inside', async () => {
    const { user, trigger, panel } = renderNav()
    await user.hover(trigger)
    await user.pointer({ keys: '[MouseLeft>]', target: within(panel()!).getAllByRole('link', { hidden: true })[0]! })
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    await user.pointer({ keys: '[MouseLeft>]', target: document.body })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('closes after choosing a service', async () => {
    const { user, trigger, panel } = renderNav()
    await user.hover(trigger)
    const first = within(panel()!).getAllByRole('link', { hidden: true })[0]!
    first.addEventListener('click', (event) => event.preventDefault())
    await user.click(first)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('marks the link as the current section on a service page', () => {
    pathname = '/services/art-sales'
    const { trigger } = renderNav()
    expect(trigger.getAttribute('aria-current')).toBe('page')
  })

  it('renders a plain link with no popup when no services are published', () => {
    const { trigger } = renderNav([])
    expect(trigger.hasAttribute('aria-expanded')).toBe(false)
    expect(trigger.hasAttribute('aria-controls')).toBe(false)
  })
})

describe('mobile menu', () => {
  it('lists the services under the Services link and closes on choosing one', async () => {
    const user = userEvent.setup()
    render(
      <div id={APP_ROOT_ID}>
        <HeaderClient services={SERVICES} />
      </div>,
    )
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    const dialog = screen.getByRole('dialog', { name: 'Menu' })
    const hrefs = within(dialog).getAllByRole('link').map((link) => link.getAttribute('href'))
    const at = hrefs.indexOf('/services')
    expect(hrefs.slice(at, at + 4)).toEqual(['/services', '/services/art-sales', '/services/art-for-rent', '/services/gallery-on-rent'])
    expect(hrefs[at - 1]).toBe('/news')
    expect(hrefs[at + 4]).toBe('/about')
    const link = within(dialog).getByRole('link', { name: 'Art for rent' })
    link.addEventListener('click', (event) => event.preventDefault())
    await user.click(link)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows only the Services link when none are published', async () => {
    const user = userEvent.setup()
    render(
      <div id={APP_ROOT_ID}>
        <HeaderClient services={[]} />
      </div>,
    )
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    const hrefs = within(screen.getByRole('dialog')).getAllByRole('link').map((link) => link.getAttribute('href'))
    expect(hrefs).toContain('/services')
    expect(hrefs.some((href) => href?.startsWith('/services/'))).toBe(false)
  })
})
