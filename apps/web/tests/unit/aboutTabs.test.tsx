// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { PublicAbout } from '@arthouz/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AboutTabs } from '@/components/about/AboutTabs'

const replace = vi.fn()

vi.mock('next/navigation', () => ({ usePathname: () => '/about', useRouter: () => ({ replace }) }))
vi.mock('@/components/about/GalleryTab', () => ({ GalleryTab: () => <p>gallery panel</p> }))
vi.mock('@/components/about/ProprietorTab', () => ({ ProprietorTab: () => <p>proprietor panel</p> }))
vi.mock('@/components/about/ServicesTab', () => ({ ServicesTab: () => <p>services panel</p> }))
vi.mock('@/components/about/PublicationsTab', () => ({ PublicationsTab: () => <p>publications panel</p> }))

const about = {} as PublicAbout
const tabNamed = (name: RegExp) => screen.getByRole('tab', { name })

describe('AboutTabs keyboard navigation', () => {
  beforeEach(() => replace.mockClear())
  afterEach(cleanup)

  it('makes only the active tab tabbable (roving tabindex)', () => {
    render(<AboutTabs about={about} tab="services" />)

    expect(screen.getAllByRole('tab').map((tab) => tab.getAttribute('tabindex'))).toEqual(['-1', '-1', '0', '-1'])
  })

  it('moves focus and selection with ArrowRight, switches the panel at once and updates the URL', () => {
    render(<AboutTabs about={about} tab="gallery" />)

    fireEvent.keyDown(tabNamed(/Gallery/), { key: 'ArrowRight' })

    expect(document.activeElement).toBe(tabNamed(/Proprietor/))
    expect(tabNamed(/Proprietor/).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('proprietor panel')).toBeTruthy()
    expect(replace).toHaveBeenCalledWith('/about?tab=proprietor', { scroll: false })
  })

  it('wraps from the last tab to the first and from the first to the last', () => {
    render(<AboutTabs about={about} tab="publications" />)

    fireEvent.keyDown(tabNamed(/Publications/), { key: 'ArrowRight' })
    expect(document.activeElement).toBe(tabNamed(/Gallery/))
    expect(replace).toHaveBeenLastCalledWith('/about', { scroll: false })

    fireEvent.keyDown(tabNamed(/Gallery/), { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(tabNamed(/Publications/))
    expect(tabNamed(/Publications/).getAttribute('aria-selected')).toBe('true')
  })

  it('jumps to the first and last tab with Home and End', () => {
    render(<AboutTabs about={about} tab="services" />)

    fireEvent.keyDown(tabNamed(/Services/), { key: 'End' })
    expect(document.activeElement).toBe(tabNamed(/Publications/))

    fireEvent.keyDown(tabNamed(/Publications/), { key: 'Home' })
    expect(document.activeElement).toBe(tabNamed(/Gallery/))
    expect(screen.getByText('gallery panel')).toBeTruthy()
  })

  it('ignores other keys', () => {
    render(<AboutTabs about={about} tab="gallery" />)

    fireEvent.keyDown(tabNamed(/Gallery/), { key: 'a' })

    expect(replace).not.toHaveBeenCalled()
    expect(tabNamed(/Gallery/).getAttribute('aria-selected')).toBe('true')
  })
})
