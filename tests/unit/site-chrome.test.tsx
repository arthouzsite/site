// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const pathname = vi.hoisted(() => ({ current: '/' }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

import { SiteChrome } from '@/components/site/SiteChrome'

afterEach(cleanup)

function renderAt(path: string) {
  pathname.current = path
  render(
    <SiteChrome header={<header>site header</header>} footer={<footer>site footer</footer>}>
      <p>page body</p>
    </SiteChrome>,
  )
}

describe('SiteChrome', () => {
  it.each(['/', '/exhibitions', '/administration'])('wraps %s in the public header and footer', (path) => {
    renderAt(path)
    expect(screen.getByText('site header')).toBeTruthy()
    expect(screen.getByText('page body')).toBeTruthy()
    expect(screen.getByText('site footer')).toBeTruthy()
  })

  it.each(['/admin', '/admin/login', '/admin/exhibitions/abc'])('renders only the page for %s', (path) => {
    renderAt(path)
    expect(screen.getByText('page body')).toBeTruthy()
    expect(screen.queryByText('site header')).toBeNull()
    expect(screen.queryByText('site footer')).toBeNull()
  })
})
