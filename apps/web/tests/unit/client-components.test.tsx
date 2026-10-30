// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const replace = vi.fn()
vi.mock('next/navigation', () => ({
  usePathname: () => '/exhibitions',
  useRouter: () => ({ replace, push: vi.fn() }),
}))
vi.mock('@/app/fonts', () => ({ fontVariables: 'font-a' }))
vi.mock('@/styles/globals.css', () => ({}))

import ErrorPage from '@/app/error'
import GlobalError from '@/app/global-error'
import { LetterStrip } from '@/components/artists/LetterStrip'
import { CityChips } from '@/components/exhibitions/CityChips'
import { StatusChips } from '@/components/exhibitions/StatusChips'

afterEach(() => {
  cleanup()
  replace.mockReset()
  vi.restoreAllMocks()
})

describe('exhibition filter chips', () => {
  it('writes the chosen status to the URL, keeping the city filter', () => {
    render(<StatusChips current={{ city: 'Chennai' }} />)
    expect(screen.getByRole('button', { name: 'All' })).toHaveProperty('ariaPressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Upcoming' }))
    expect(replace).toHaveBeenCalledWith('/exhibitions?status=upcoming&city=Chennai', { scroll: false })
  })

  it('clears the status when All is chosen', () => {
    render(<StatusChips current={{ status: 'past' }} />)
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(replace).toHaveBeenCalledWith('/exhibitions', { scroll: false })
  })

  it('marks the active city case-insensitively and navigates on click', () => {
    render(<CityChips cities={['Chennai', 'Bengaluru']} current={{ city: 'chennai', status: 'current' }} />)
    expect(screen.getByRole('button', { name: 'Chennai' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'All locations' }).getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(screen.getByRole('button', { name: 'Bengaluru' }))
    expect(replace).toHaveBeenCalledWith('/exhibitions?status=current&city=Bengaluru', { scroll: false })
    fireEvent.click(screen.getByRole('button', { name: 'All locations' }))
    expect(replace).toHaveBeenLastCalledWith('/exhibitions?status=current', { scroll: false })
  })
})

describe('LetterStrip', () => {
  function stubMotion(reduced: boolean) {
    vi.stubGlobal('matchMedia', () => ({ matches: reduced }))
    const scrollTo = vi.fn()
    vi.stubGlobal('scrollTo', scrollTo)
    return scrollTo
  }

  it('scrolls smoothly to the letter section', () => {
    const scrollTo = stubMotion(false)
    document.body.insertAdjacentHTML('beforeend', '<section id="L-N"></section>')
    render(<LetterStrip letters={['N']} />)
    fireEvent.click(screen.getByRole('button', { name: 'N' }))
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }))
  })

  it('jumps without animation for reduced motion and ignores a missing section', () => {
    const scrollTo = stubMotion(true)
    document.body.insertAdjacentHTML('beforeend', '<section id="L-R"></section>')
    render(<LetterStrip letters={['R', 'Z']} />)
    fireEvent.click(screen.getByRole('button', { name: 'R' }))
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'auto' }))
    scrollTo.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Z' }))
    expect(scrollTo).not.toHaveBeenCalled()
  })
})

describe('error boundaries', () => {
  it('logs the digest and retries from the page boundary', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const reset = vi.fn()
    render(<ErrorPage error={Object.assign(new Error('boom'), { digest: 'd1' })} reset={reset} />)
    expect(log).toHaveBeenCalledWith('[web] page error', 'd1')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('falls back to the message when there is no digest', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(<ErrorPage error={new Error('plain')} reset={vi.fn()} />)
    expect(log).toHaveBeenCalledWith('[web] page error', 'plain')
  })

  it('renders the root-layout boundary with its own document shell', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const reset = vi.fn()
    render(<GlobalError error={new Error('root')} reset={reset} />)
    expect(log).toHaveBeenCalledWith('[web] root layout error', 'root')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(reset).toHaveBeenCalledTimes(1)
  })
})
