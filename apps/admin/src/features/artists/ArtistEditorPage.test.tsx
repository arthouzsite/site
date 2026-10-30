import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { API_URL, HttpResponse, envelope, errorEnvelope, http, server } from '../../test/msw'
import ArtistEditorPage from './ArtistEditorPage'
import { makeArtist, makeArtwork, renderRoutes } from './testUtils'

type Call = { method: string; path: string; body: unknown }
const artist = makeArtist({ isFeatured: true, featuredOrder: 2 })
const routes = [
  { path: '/artists/new', element: <ArtistEditorPage /> },
  { path: '/artists/:id', element: <ArtistEditorPage /> },
  { path: '/artists', element: <p>Artists list</p> },
]

function setup(initial: string, opts: { homeFocusArtistId?: string | null } = {}) {
  const calls: Call[] = []
  const exhibitionQueries: URLSearchParams[] = []
  const record = async (method: string, path: string, request: Request) => {
    calls.push({ method, path, body: await request.json() })
  }
  server.use(
    http.get(`${API_URL}/artists/a1`, () => HttpResponse.json(envelope(artist))),
    http.get(`${API_URL}/artists/a9`, () => HttpResponse.json(envelope(makeArtist({ id: 'a9', name: 'Fresh Artist' })))),
    http.get(`${API_URL}/artists/a1/artworks`, () => HttpResponse.json(envelope([makeArtwork()]))),
    http.get(`${API_URL}/artists/a9/artworks`, () => HttpResponse.json(envelope([]))),
    http.get(`${API_URL}/artists`, () =>
      HttpResponse.json({ ...envelope([makeArtist({ id: 'a0', featuredOrder: 1, isFeatured: true, name: 'Other' }), artist]), meta: { total: 2, page: 1, limit: 100 } }),
    ),
    http.get(`${API_URL}/exhibitions`, ({ request }) => {
      exhibitionQueries.push(new URL(request.url).searchParams)
      return HttpResponse.json({
        ...envelope([{ id: 'e1', title: 'Naan Yaar', city: 'Chennai', status: 'PAST' }]),
        meta: { total: 1, page: 1, limit: 50 },
      })
    }),
    http.get(`${API_URL}/settings/homeFocus`, () => HttpResponse.json(envelope({ artistId: opts.homeFocusArtistId ?? null }))),
    http.patch(`${API_URL}/artists/a1`, async ({ request }) => {
      const body = (await request.clone().json()) as { name: string }
      await record('PATCH', '/artists/a1', request)
      return HttpResponse.json(envelope({ ...artist, name: body.name }))
    }),
    http.post(`${API_URL}/artists`, async ({ request }) => {
      await record('POST', '/artists', request)
      return HttpResponse.json(envelope(makeArtist({ id: 'a9', name: 'Fresh Artist' })), { status: 201 })
    }),
    http.patch(`${API_URL}/artists/a1/publish`, async ({ request }) => {
      await record('PATCH', '/artists/a1/publish', request)
      return HttpResponse.json(envelope({ ...artist, isPublished: false }))
    }),
    http.patch(`${API_URL}/artists/a1/feature`, async ({ request }) => {
      await record('PATCH', '/artists/a1/feature', request)
      return HttpResponse.json(envelope({ ...artist, isFeatured: false }))
    }),
  )
  return { calls, exhibitionQueries, ...renderRoutes(routes, initial) }
}

describe('ArtistEditorPage', () => {
  it('saves the full payload with PATCH and confirms with a toast', async () => {
    const { calls } = setup('/artists/a1')
    const user = userEvent.setup()
    const name = await screen.findByLabelText(/^Name/)
    await waitFor(() => expect(name).toHaveValue('Alpha Artist'))
    await user.clear(name)
    await user.type(name, 'Alpha Renamed')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0]).toEqual({
      method: 'PATCH',
      path: '/artists/a1',
      body: {
        name: 'Alpha Renamed', sortName: '', slug: 'alpha-artist', medium: 'Painting', base: 'Chennai',
        born: '1956', lede: 'A lede.', bio: 'A bio.', portraitImageId: null,
      },
    })
    expect(await screen.findByText('Saved · Alpha Renamed')).toBeInTheDocument()
  })

  it('shows the name as the sort name placeholder and blocks an empty name', async () => {
    setup('/artists/a1')
    const user = userEvent.setup()
    const name = await screen.findByLabelText(/^Name/)
    await waitFor(() => expect(name).toHaveValue('Alpha Artist'))
    expect(screen.getByLabelText('Sort name')).toHaveAttribute('placeholder', 'Alpha Artist')
    await user.clear(name)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('There is a problem')
  })

  it('publish and feature are independent mutations, locked while the form is dirty', async () => {
    const { calls } = setup('/artists/a1')
    const user = userEvent.setup()
    const published = await screen.findByRole('switch', { name: 'Published' })
    await waitFor(() => expect(published).toBeEnabled())
    await user.click(published)
    await waitFor(() => expect(calls).toEqual([{ method: 'PATCH', path: '/artists/a1/publish', body: { isPublished: false } }]))
    await user.type(screen.getByLabelText('Medium'), ' on wood')
    expect(screen.getByRole('switch', { name: 'Published' })).toBeDisabled()
    expect(screen.getByRole('switch', { name: 'Featured' })).toBeDisabled()
  })

  it('shows the featured position', async () => {
    setup('/artists/a1')
    expect(await screen.findByText('2 of 2')).toBeInTheDocument()
  })

  it('lists the exhibitions returned for this artist id', async () => {
    const { exhibitionQueries } = setup('/artists/a1')
    const list = await screen.findByRole('list', { name: 'Exhibitions' })
    expect(within(list).getByText('Naan Yaar')).toBeInTheDocument()
    expect(exhibitionQueries[0]!.get('artistId')).toBe('a1')
    expect(exhibitionQueries[0]!.get('q')).toBeNull()
  })

  it('links to settings only when this artist is the home focus', async () => {
    setup('/artists/a1', { homeFocusArtistId: 'a1' })
    expect(await screen.findByRole('link', { name: /Shown on home as artist in focus/ })).toHaveAttribute('href', '/settings')
  })

  it('does not show the home focus note for other artists', async () => {
    setup('/artists/a1', { homeFocusArtistId: 'other' })
    await screen.findByRole('list', { name: 'Exhibitions' })
    expect(screen.queryByText('Shown on home as artist in focus')).not.toBeInTheDocument()
  })

  it('creates a new artist with POST, suggests the slug and opens the saved record', async () => {
    const { calls, router } = setup('/artists/new')
    const user = userEvent.setup()
    expect(screen.getAllByText('Save the artist first')).toHaveLength(2)
    expect(screen.getByRole('switch', { name: 'Published' })).toBeDisabled()
    await user.type(screen.getByLabelText(/^Name/), 'Fresh Artist')
    expect(screen.getByLabelText('Slug')).toHaveValue('fresh-artist')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(calls[0]).toMatchObject({ method: 'POST', path: '/artists', body: { name: 'Fresh Artist', slug: 'fresh-artist' } }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/artists/a9'))
  })

  it('keeps a hand-edited slug while the name changes', async () => {
    setup('/artists/new')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Slug'), 'custom')
    await user.type(screen.getByLabelText(/^Name/), 'Zed')
    expect(screen.getByLabelText('Slug')).toHaveValue('custom')
  })

  it('maps server validation errors onto fields and the summary', async () => {
    setup('/artists/a1')
    server.use(
      http.patch(`${API_URL}/artists/a1`, () =>
        HttpResponse.json(errorEnvelope('VALIDATION', 'Invalid input', { slug: 'Slug is already taken' }), { status: 400 }),
      ),
    )
    const user = userEvent.setup()
    const name = await screen.findByLabelText(/^Name/)
    await waitFor(() => expect(name).toHaveValue('Alpha Artist'))
    await user.type(name, ' II')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findAllByText('Slug is already taken')).not.toHaveLength(0)
  })

  it('reports a missing artist', async () => {
    setup('/artists/missing')
    server.use(http.get(`${API_URL}/artists/missing`, () => HttpResponse.json(errorEnvelope('NOT_FOUND', 'Artist not found'), { status: 404 })))
    expect(await screen.findByText(/Could not load this artist/)).toBeInTheDocument()
  })
})
