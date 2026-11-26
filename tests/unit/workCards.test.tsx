// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkCards, type WorkCard } from '@/components/works/WorkCards'
import { APP_ROOT_ID } from '@/lib/dom'

const image = (name: string) => ({ url: `https://cdn.test/${name}.jpg`, thumbUrl: `https://cdn.test/${name}-t.jpg`, width: 1200, height: 900, alt: name })
const artist = { slug: 'vijay', name: 'Vijay Pichumani' }
const works: WorkCard[] = [
  { id: 'w1', title: 'Monsoon Study', image: image('monsoon'), artist, caption: 'Monsoon Study, 2028' },
  { id: 'w2', title: 'Red Earth', image: image('red-earth'), artist, caption: 'Red Earth, 2027' },
  { id: 'w3', title: 'Unphotographed', image: null, artist, caption: 'Unphotographed, 2026' },
]

const fetchMock = vi.fn<typeof fetch>()
const accepted = () => new Response(JSON.stringify({ ok: true, data: { received: true }, error: null }), { status: 201, headers: { 'content-type': 'application/json' } })

function renderWorks() {
  const user = userEvent.setup()
  render(
    <div id={APP_ROOT_ID}>
      <WorkCards title="Vijay Pichumani" works={works} ratio="1/1" sizes="100vw" minColumn={280} columns="fill" />
    </div>,
  )
  return user
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('WorkCards', () => {
  it('offers View and Enquire on every pictured work and neither on a work without an image', () => {
    renderWorks()
    expect(screen.getAllByRole('button', { name: /^View / })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: /^Enquire about / })).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'View Unphotographed' })).toBeNull()
  })

  it('View opens the whole image of that work', async () => {
    const user = renderWorks()
    await user.click(screen.getByRole('button', { name: 'View Red Earth' }))
    const viewer = screen.getByRole('dialog', { name: 'Vijay Pichumani' })
    expect(within(viewer).getByAltText('red-earth').className).toContain('object-contain')
    expect(within(viewer).getByText('2 / 2')).toBeTruthy()
  })

  it('Enquire opens the form beside the work and sends the work with the enquiry', async () => {
    fetchMock.mockResolvedValueOnce(accepted())
    const user = renderWorks()
    await user.click(screen.getByRole('button', { name: 'Enquire about Red Earth' }))
    const dialog = screen.getByRole('dialog', { name: 'Enquire: Red Earth, Vijay Pichumani' })
    expect(within(dialog).getByAltText('red-earth')).toBeTruthy()
    expect(within(dialog).getByRole('heading', { name: 'Red Earth' })).toBeTruthy()
    expect(within(dialog).getByRole('link', { name: 'Art Houz home' }).getAttribute('href')).toBe('/')
    await user.type(within(dialog).getByRole('textbox', { name: /^Name/ }), 'Asha Rao')
    await user.type(within(dialog).getByRole('textbox', { name: /^Mobile/ }), '98765 43210')
    await user.type(within(dialog).getByRole('textbox', { name: /^Email/ }), 'asha@example.com')
    await user.click(within(dialog).getByRole('button', { name: 'Send enquiry' }))
    await screen.findByRole('status')
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({ kind: 'ARTIST', slug: 'vijay', imageUrl: 'https://cdn.test/red-earth.jpg' })
  })

  it('Enquire inside the viewer returns to the viewer on Close', async () => {
    const user = renderWorks()
    await user.click(screen.getByRole('button', { name: 'View Monsoon Study' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Enquire' }))
    expect(screen.getByRole('dialog', { name: 'Enquire: Monsoon Study, Vijay Pichumani' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.getByRole('dialog', { name: 'Vijay Pichumani' })).toBeTruthy()
  })
})
