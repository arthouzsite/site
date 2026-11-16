// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AnchorHTMLAttributes, ImgHTMLAttributes } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FairRow } from '@/components/fairs/FairRow'
import { publicFairSchema } from '@/lib/shared'
import { APP_ROOT_ID } from '@/lib/dom'
import { fair, image } from './support/publicFixtures'

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt, src }: ImgHTMLAttributes<HTMLImageElement>) => <img alt={alt} src={src as string} />,
}))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const gallery = [1, 2, 3].map((n) => ({ ...image, url: `https://x/${n}.jpg`, thumbUrl: `https://x/${n}t.jpg`, alt: `View ${n}` }))

function renderRow(images = gallery) {
  const user = userEvent.setup()
  render(
    <div id={APP_ROOT_ID}>
      <FairRow fair={{ ...fair, gallery: images }} />
    </div>,
  )
  return { user, title: screen.getByRole('link', { name: 'India Art Fair' }) }
}
const shown = () => within(screen.getByRole('dialog')).getByRole('img', { name: /^View \d$/ }).getAttribute('alt')

afterEach(cleanup)

describe('fair gallery overlay', () => {
  it('opens on title click without navigating, headed by the fair title, at 1 / total', async () => {
    const { user, title } = renderRow()
    expect(screen.queryByRole('dialog')).toBeNull()
    await user.click(title)
    const dialog = screen.getByRole('dialog', { name: 'India Art Fair' })
    expect(dialog).toBeTruthy()
    expect(within(dialog).getByText('1 / 3')).toBeTruthy()
    expect(shown()).toBe('View 1')
  })

  it('steps with Previous / Next, wrapping at both ends', async () => {
    const { user, title } = renderRow()
    await user.click(title)
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(shown()).toBe('View 2')
    expect(screen.getByText('2 / 3')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Previous' }))
    await user.click(screen.getByRole('button', { name: 'Previous' }))
    expect(shown()).toBe('View 3')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(shown()).toBe('View 1')
  })

  it('navigates with the arrow keys and jumps with a thumbnail', async () => {
    const { user, title } = renderRow()
    await user.click(title)
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(shown()).toBe('View 3')
    await user.keyboard('{ArrowLeft}')
    expect(shown()).toBe('View 2')
    await user.click(screen.getByRole('button', { name: 'Show image 1' }))
    expect(shown()).toBe('View 1')
    expect(screen.getByRole('button', { name: 'Show image 1' }).getAttribute('aria-current')).toBe('true')
  })

  it('closes on Escape and on Close, returning focus to the title and unlocking the page', async () => {
    const { user, title } = renderRow()
    await user.click(title)
    expect(document.getElementById(APP_ROOT_ID)?.hasAttribute('inert')).toBe(true)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(title)
    expect(document.getElementById(APP_ROOT_ID)?.hasAttribute('inert')).toBe(false)
    await user.click(title)
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(title)
  })

  it('shows no navigation controls for a single image', async () => {
    const { user, title } = renderRow(gallery.slice(0, 1))
    await user.click(title)
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()
    expect(screen.queryByText(/\//)).toBeNull()
  })
})

describe('publicFairSchema', () => {
  it('parses a list item cached before galleries existed, defaulting gallery to empty', () => {
    const legacy: Partial<typeof fair> = { ...fair }
    delete legacy.gallery
    expect(publicFairSchema.parse(legacy).gallery).toEqual([])
  })
})
