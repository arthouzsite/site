import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { API_URL, HttpResponse, envelope, http, server } from '../../test/msw'
import { renderRoutes } from '../../test/renderRoutes'
import NewsEditorPage from './NewsEditorPage'
import NewsListPage from './NewsListPage'
import { makeNews } from './testData'

const routes = [
  { path: '/news', element: <NewsListPage /> },
  { path: '/news/new', element: <NewsEditorPage /> },
  { path: '/news/:id', element: <NewsEditorPage /> },
]
const E1 = '11111111-1111-4111-8111-111111111111'
const E2 = '22222222-2222-4222-8222-222222222222'
const exhibitions = [
  { id: E1, title: 'By Nature’s Force', slug: 'by-natures-force' },
  { id: E2, title: 'Tidewater', slug: 'tidewater' },
]
const linked = makeNews({ id: 'n2', title: 'Press piece', exhibitionId: E1, exhibition: { id: E1, title: 'By Nature’s Force', slug: 'by-natures-force' }, externalUrl: 'https://press.example/a' })
const HELP = 'Adds ‘View exhibition →’ and lists this item under Press on the exhibition page'

function listHandler(items = [makeNews(), linked], seen: URL[] = []) {
  return http.get(`${API_URL}/news`, ({ request }) => {
    seen.push(new URL(request.url))
    return HttpResponse.json({ ...envelope(items), meta: { total: 45, page: 1, limit: 20 } })
  })
}

describe('NewsListPage', () => {
  it('news Tamil title renders in display font', async () => {
    const tamil = makeNews({ id: 'n3', title: 'Pa Ranjith கூட இது ரொம்ப புடிச்சிருக்கு | A Solo Show' })
    server.use(listHandler([tamil, makeNews()]))
    renderRoutes(routes, '/news')
    const link = await screen.findByRole('link', { name: /^Pa Ranjith/ })
    expect(link).toHaveAttribute('lang', 'ta')
    expect(link).toHaveClass('font-display')
    expect(screen.getByRole('link', { name: 'A Solo Show' })).not.toHaveAttribute('lang')
  })

  it('shows exhibition chip, external-link marker, URL-synced filters and paging', async () => {
    const seen: URL[] = []
    server.use(listHandler([makeNews(), linked], seen))
    const { router } = renderRoutes(routes, '/news?q=&page=1')
    expect(await screen.findByText('By Nature’s Force')).toBeInTheDocument()
    expect(screen.getAllByText('External article set')).toHaveLength(1)
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'false')
    await waitFor(() => expect(seen.at(-1)!.searchParams.get('published')).toBe('false'))
    await userEvent.type(screen.getByLabelText('Search news'), 'solo')
    await waitFor(() => expect(router.state.location.search).toContain('q=solo'))
    await userEvent.click(await screen.findByRole('button', { name: 'Page 2' }))
    await waitFor(() => expect(seen.at(-1)!.searchParams.get('page')).toBe('2'))
  })

  it('navigates to the editor from a row and toggles publish', async () => {
    let body: unknown
    server.use(
      listHandler(),
      http.patch(`${API_URL}/news/n1/publish`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(envelope(makeNews({ isPublished: false })))
      }),
    )
    const { router } = renderRoutes(routes, '/news')
    await userEvent.click(await screen.findByRole('switch', { name: 'Published: A Solo Show' }))
    await waitFor(() => expect(body).toEqual({ isPublished: false }))
    await userEvent.click(screen.getByRole('link', { name: 'A Solo Show' }))
    expect(router.state.location.pathname).toBe('/news/n1')
  })
})

describe('NewsEditorPage', () => {
  it('news editor shows the exhibition help copy only when linked', async () => {
    server.use(
      http.get(`${API_URL}/news/n2`, () => HttpResponse.json(envelope(linked))),
      http.get(`${API_URL}/exhibitions`, () => HttpResponse.json(envelope(exhibitions))),
    )
    renderRoutes(routes, '/news/n2')
    expect(await screen.findByText(HELP)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Remove linked exhibition/ }))
    expect(screen.queryByText(HELP)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('combobox', { name: /Linked exhibition/ }))
    await userEvent.click(await screen.findByRole('option', { name: 'Tidewater' }))
    expect(await screen.findByText(HELP)).toBeInTheDocument()
  })

  it('PATCHes the full payload with first-of-month publishedAt and surfaces server field errors', async () => {
    let patched: Record<string, unknown> | undefined
    server.use(
      http.get(`${API_URL}/news/n2`, () => HttpResponse.json(envelope(linked))),
      http.get(`${API_URL}/exhibitions`, () => HttpResponse.json(envelope(exhibitions))),
      http.patch(`${API_URL}/news/n2`, async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ ok: false, data: null, error: { code: 'VALIDATION', message: 'Invalid', fields: { exhibitionId: 'Exhibition not found' } } }, { status: 400 })
      }),
    )
    renderRoutes(routes, '/news/n2')
    await screen.findByText(HELP)
    await userEvent.selectOptions(screen.getByLabelText('Month'), 'August')
    await userEvent.selectOptions(screen.getByLabelText('Year'), '2023')
    expect(screen.getByRole('switch', { name: 'Published' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(patched).toBeDefined())
    expect(patched).toMatchObject({ title: 'Press piece', slug: 'solo-show', publishedAt: '2023-08-01T00:00:00.000Z', exhibitionId: E1, externalUrl: 'https://press.example/a', excerpt: 'Excerpt' })
    expect((await screen.findAllByText('Exhibition not found')).length).toBeGreaterThan(0)
    expect(within(screen.getByRole('alert')).getByText('Exhibition not found')).toBeInTheDocument()
  })

  it('creates a news item and deletes through a confirm modal', async () => {
    let posted: Record<string, unknown> | undefined
    let deleted = false
    server.use(
      http.get(`${API_URL}/exhibitions`, () => HttpResponse.json(envelope(exhibitions))),
      http.post(`${API_URL}/news`, async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(envelope(makeNews({ id: 'n9', title: 'Fresh' })))
      }),
      http.get(`${API_URL}/news/n9`, () => HttpResponse.json(envelope(makeNews({ id: 'n9', title: 'Fresh' })))),
      http.delete(`${API_URL}/news/n9`, () => {
        deleted = true
        return HttpResponse.json(envelope(null))
      }),
      listHandler([]),
    )
    const { router } = renderRoutes(routes, '/news/new')
    await userEvent.type(await screen.findByLabelText(/Title/), 'Fresh')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/news/n9'))
    expect(posted).toMatchObject({ title: 'Fresh', exhibitionId: null, externalUrl: null })
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete news item' }))
    await waitFor(() => expect(deleted).toBe(true))
    await waitFor(() => expect(router.state.location.pathname).toBe('/news'))
  })
})
