import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '../lib/toast'
import { routes } from './router'
import { API_URL, HttpResponse, envelope, http, server } from '../test/msw'

// Pages with real data calls get empty answers so these route tests stay about routing.
const empty = (path: string, data: unknown = []) => http.get(`${API_URL}${path}`, () => HttpResponse.json(envelope(data)))
const emptyHandlers = [
  empty('/exhibitions'), empty('/artists'), empty('/news'), empty('/media'), empty('/users'), empty('/settings', {}),
  empty('/public/home', { hero: null, heroLayout: 'FULL_BLEED', upcoming: null, focus: { artist: null }, artistsLine: [] }),
]

const PAGES: Array<[string, string | RegExp]> = [
  ['/', /^Good (morning|afternoon|evening)/], ['/exhibitions', 'Exhibitions'], ['/exhibitions/new', 'New exhibition'], ['/exhibitions/abc', 'Exhibition'],
  ['/artists', 'Artists'], ['/artists/new', 'New artist'], ['/artists/a1', 'Alpha Artist'],
  ['/fairs', 'Fairs'], ['/fairs/new', 'New fair'],
  ['/news', 'News'], ['/news/new', 'New news item'], ['/locations', 'Locations'], ['/about', 'About page'],
  ['/settings', 'Home & settings'], ['/media', 'Media'], ['/users', 'Users'],
]

describe('routes', () => {
  it.each(PAGES)('%s renders its page title', async (path, title) => {
    const artist = { id: 'a1', slug: 'alpha', name: 'Alpha Artist', sortName: 'Alpha Artist', medium: '', base: '', born: null, lede: '', bio: '', portraitImageId: null, isFeatured: false, featuredOrder: 0, isPublished: false, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z', portraitImage: null, artworkCount: 0, indexLetter: 'A' }
    server.use(
      http.get(`${API_URL}/fairs`, () => HttpResponse.json(envelope([]))),
      http.get(`${API_URL}/news`, () => HttpResponse.json(envelope([]))),
      http.get(`${API_URL}/locations`, () => HttpResponse.json(envelope([]))),
      http.get(`${API_URL}/artists`, () => HttpResponse.json({ ...envelope([artist]), meta: { total: 1, page: 1, limit: 20 } })),
      http.get(`${API_URL}/artists/a1`, () => HttpResponse.json(envelope(artist))),
      http.get(`${API_URL}/artists/a1/artworks`, () => HttpResponse.json(envelope([]))),
      http.get(`${API_URL}/exhibitions`, () => HttpResponse.json({ ...envelope([]), meta: { total: 0, page: 1, limit: 50 } })),
      http.get(`${API_URL}/settings/homeFocus`, () => HttpResponse.json(envelope({ artistId: null }))),
      ...emptyHandlers,
    )
    server.use(http.get(`${API_URL}/auth/me`, () => HttpResponse.json(envelope({ id: '1', email: 'a@x.com', name: 'Ada Admin', role: 'ADMIN' }))))
    const router = createMemoryRouter(routes, { initialEntries: [path] })
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ToastProvider><RouterProvider router={router} /></ToastProvider>
      </QueryClientProvider>,
    )
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument()
  })
})
