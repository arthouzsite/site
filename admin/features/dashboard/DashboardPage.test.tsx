import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SETTING_DEFAULTS } from '@/lib/shared'
import { API_URL, HttpResponse, envelope, http, server } from '../../test/msw'
import { renderPage, signIn } from '../settings/testUtils'
import DashboardPage from './DashboardPage'
import { dateLine, greeting, timeAgo } from './dates'

const ex = (over: Record<string, unknown>) => ({
  id: 'x', title: 'X', startDate: '2026-10-01', endDate: '2026-11-22', isPublished: true, status: 'CURRENT',
  updatedAt: new Date(Date.now() - 12.5 * 60_000).toISOString(), heroImage: null, ...over,
})
const withMeta = (data: unknown[], total: number) => HttpResponse.json({ ...envelope(data), meta: { total, page: 1, limit: 5 } })

function setup() {
  signIn()
  server.use(
    http.get(`${API_URL}/exhibitions`, ({ request }) => {
      const q = new URL(request.url).searchParams
      if (q.get('status') === 'current') return withMeta([ex({ id: 'c1', title: 'Tidewater', endDate: '2026-11-22' })], 1)
      if (q.get('status') === 'upcoming') return withMeta([ex({ id: 'u1', title: 'The Weight of Light', startDate: '2027-01-14', status: 'UPCOMING' })], 1)
      if (q.get('published') === 'false') return withMeta([ex({ id: 'd1' }), ex({ id: 'd2' }), ex({ id: 'd3' })], 3)
      return withMeta([ex({ id: 'c1', title: 'Tidewater', heroImage: { thumbUrl: 'https://cdn.example/t.jpg' } }), ex({ id: 'p1', title: 'Quiet Matter', status: 'PAST', updatedAt: '2020-01-01T00:00:00.000Z' })], 2)
    }),
    http.get(`${API_URL}/artists`, () => HttpResponse.json(envelope([
      { id: 'a1', name: 'Vijay Pichumani', isPublished: true, updatedAt: new Date(Date.now() - 3_600_000 * 2).toISOString(), portraitImage: null },
    ]))),
    http.get(`${API_URL}/news`, () => HttpResponse.json(envelope([
      { id: 'n1', title: 'Soil to canvas', isPublished: false, updatedAt: new Date(Date.now() - 3_600_000 * 30).toISOString(), image: null },
    ]))),
    http.get(`${API_URL}/media`, () => withMeta([], 2)),
    http.get(`${API_URL}/settings`, () => HttpResponse.json(envelope(SETTING_DEFAULTS))),
    http.get(`${API_URL}/public/home`, () => HttpResponse.json(envelope({
      hero: { title: 'Tidewater' }, heroLayout: 'FULL_BLEED', upcoming: { title: 'The Weight of Light' },
      focus: { artist: { name: 'Vijay Pichumani', slug: 'v' } }, artistsLine: new Array(22).fill({ name: 'a', slug: 'a' }),
    }))),
  )
  renderPage(<DashboardPage />)
}

const tile = (name: string) => within(screen.getByRole('region', { name: 'Overview' })).getByText(name).closest('a, div') as HTMLElement

describe('DashboardPage', () => {
  it('dashboard shows drafts count', async () => {
    setup()
    const drafts = tile('Drafts')
    expect(await within(drafts).findByText('3')).toBeInTheDocument()
    expect(within(drafts).getByText('awaiting publish')).toBeInTheDocument()
  })

  it('shows now on view, upcoming and missing-alt tiles', async () => {
    setup()
    expect(await within(tile('Now on view')).findByText('Tidewater · ends 22 Nov')).toBeInTheDocument()
    expect(await within(tile('Upcoming')).findByText('The Weight of Light · 14 Jan')).toBeInTheDocument()
    const media = tile('Media without alt text')
    expect(await within(media).findByText('2')).toBeInTheDocument()
    expect(within(media).getByRole('link', { name: 'Add alt text in Media' })).toHaveAttribute('href', '/media?missingAlt=true')
  })

  it('greets by first name and lists recent edits newest first with editor links', async () => {
    setup()
    expect(await screen.findByRole('heading', { level: 1, name: /^Good (morning|afternoon|evening), Priya$/ })).toBeInTheDocument()
    const list = await screen.findByRole('list')
    await within(list).findByText('Tidewater')
    const names = within(list).getAllByRole('link').map((l) => l.textContent)
    expect(names).toEqual(['Tidewater', 'Vijay Pichumani', 'Soil to canvas', 'Quiet Matter'])
    expect(within(list).getByRole('link', { name: 'Vijay Pichumani' })).toHaveAttribute('href', '/artists/a1')
    expect(within(list).getByText('Exhibition · edited 12 min ago')).toBeInTheDocument()
    expect(within(list).getByText('Draft')).toBeInTheDocument()
    expect(within(list).getByText('Now on view')).toBeInTheDocument()
    expect(within(list).getByText('Past')).toBeInTheDocument()
  })

  it('summarises the home page with change links and quick actions', async () => {
    setup()
    const home = within(await screen.findByRole('region', { name: 'On the home page now' }))
    expect(await home.findByText('Tidewater (auto)')).toBeInTheDocument()
    expect(home.getByText('Full-bleed')).toBeInTheDocument()
    expect(home.getByText('22 artists')).toBeInTheDocument()
    expect(home.getByRole('link', { name: 'Change hero' })).toHaveAttribute('href', '/settings')
    const quick = within(screen.getByRole('region', { name: 'Quick actions' }))
    expect(quick.getByRole('link', { name: 'New exhibition' })).toHaveAttribute('href', '/exhibitions/new')
    expect(quick.getByRole('link', { name: 'Upload media' })).toHaveAttribute('href', '/media')
  })
})

describe('dashboard dates', () => {
  const noon = new Date('2026-10-30T09:00:00Z')
  it('formats the greeting and date line in Asia/Kolkata', () => {
    expect(greeting(noon, 'Priya')).toBe('Good afternoon, Priya')
    expect(greeting(new Date('2026-10-30T01:00:00Z'), 'Priya')).toBe('Good morning, Priya')
    expect(greeting(new Date('2026-10-30T14:00:00Z'), 'Priya')).toBe('Good evening, Priya')
    expect(dateLine(noon)).toBe('Friday 30 October 2026 · Chennai')
  })
  it('describes elapsed time', () => {
    expect(timeAgo('2026-10-30T08:59:40Z', noon)).toBe('just now')
    expect(timeAgo('2026-10-30T08:00:00Z', noon)).toBe('1 hr ago')
    expect(timeAgo('2026-10-29T08:00:00Z', noon)).toBe('yesterday')
    expect(timeAgo('2026-10-27T08:00:00Z', noon)).toBe('3 days ago')
    expect(timeAgo('2026-09-01T08:00:00Z', noon)).toBe('1 Sept')
  })
})
