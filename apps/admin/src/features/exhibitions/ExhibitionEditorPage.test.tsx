import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { API_URL, HttpResponse, envelope, errorEnvelope, http, server } from '../../test/msw'
import ExhibitionEditorPage from './ExhibitionEditorPage'
import ExhibitionsListPage from './ExhibitionsListPage'
import { ID, makeExhibition, makeWork, renderRoutes, useEditorHandlers } from './testUtils'

const ROUTES = [
  { path: '/exhibitions', element: <ExhibitionsListPage /> },
  { path: '/exhibitions/new', element: <ExhibitionEditorPage /> },
  { path: '/exhibitions/:id', element: <ExhibitionEditorPage /> },
]

const editPath = `/exhibitions/${ID.ex}`

describe('ExhibitionEditorPage', () => {
  it('end before start shows inline error under End date and the summary', async () => {
    useEditorHandlers(makeExhibition())
    renderRoutes(editPath, ROUTES)
    const end = await screen.findByLabelText(/End date/)
    fireEvent.change(end, { target: { value: '2026-09-01' } })
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    const message = 'End date must be on or after the start date'
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('There is a problem')).toBeInTheDocument()
    expect(within(alert).getByRole('link', { name: message })).toBeInTheDocument()
    expect(end).toHaveAccessibleDescription(message)
  })

  it('server 400 fields map onto the form', async () => {
    const ex = makeExhibition()
    useEditorHandlers(ex)
    server.use(
      http.patch(`${API_URL}/exhibitions/${ex.id}`, () =>
        HttpResponse.json(errorEnvelope('VALIDATION', 'Check the highlighted fields', { slug: 'That slug is already used' }), { status: 400 }),
      ),
    )
    renderRoutes(editPath, ROUTES)
    await userEvent.click(await screen.findByRole('button', { name: 'Save' }))
    expect(await screen.findByLabelText(/^Slug/)).toHaveAccessibleDescription(/That slug is already used/)
    expect(within(screen.getByRole('alert')).getByRole('link', { name: 'That slug is already used' })).toBeInTheDocument()
  })

  it('sends the full form on save and reports success', async () => {
    const ex = makeExhibition({ heroImageId: ID.img })
    useEditorHandlers(ex)
    let body: Record<string, unknown> = {}
    server.use(
      http.patch(`${API_URL}/exhibitions/${ex.id}`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(envelope(ex))
      }),
    )
    renderRoutes(editPath, ROUTES)
    const title = await screen.findByLabelText(/^Title/)
    await userEvent.clear(title)
    await userEvent.type(title, 'Tidewater II')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Saved · Tidewater II')).toBeInTheDocument()
    expect(body).toMatchObject({
      title: 'Tidewater II', subtitle: ex.subtitle, city: 'Chennai', country: 'India', type: 'GROUP', slug: 'tidewater',
      startDate: '2026-10-03T00:00:00.000Z', endDate: '2026-11-22T00:00:00.000Z', datesLabel: null, statusOverride: null,
      venue: ex.venue, blurb: ex.blurb, heroImageId: ID.img,
    })
  })

  it('creates a new exhibition with its artists, suggesting the slug from the title', async () => {
    let body: Record<string, unknown> = {}
    const created = makeExhibition()
    server.use(
      http.post(`${API_URL}/exhibitions`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(envelope(created))
      }),
    )
    useEditorHandlers(created)
    const { router } = renderRoutes('/exhibitions/new', ROUTES)
    const user = userEvent.setup()
    expect(screen.getByRole('heading', { level: 1, name: 'New exhibition' })).toBeInTheDocument()
    expect(screen.getByText('Save the exhibition first', { selector: 'p' })).toBeInTheDocument()
    await user.type(screen.getByLabelText(/^Title/), 'Quiet Matter')
    expect(screen.getByLabelText(/^Slug/)).toHaveValue('quiet-matter')
    await user.type(screen.getByLabelText(/^City/), 'Chennai')
    await user.type(screen.getByLabelText(/^Country/), 'India')
    fireEvent.change(screen.getByLabelText(/Start date/), { target: { value: '2026-06-12' } })
    fireEvent.change(screen.getByLabelText(/End date/), { target: { value: '2026-07-26' } })
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(router.state.location.pathname).toBe(editPath))
    expect(body).toMatchObject({ title: 'Quiet Matter', slug: 'quiet-matter', artistIds: [], isPublished: false })
  })

  it('shows an enter-prompt for missing required fields on a new exhibition', async () => {
    renderRoutes('/exhibitions/new', ROUTES)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByRole('link', { name: 'Enter a title' })).toBeInTheDocument()
    expect(within(alert).getByRole('link', { name: 'Enter a start date' })).toBeInTheDocument()
  })

  it('previews the status live and publishes independently of the form', async () => {
    const ex = makeExhibition({ isPublished: false })
    useEditorHandlers(ex, [makeWork()])
    let body: unknown = null
    server.use(
      http.patch(`${API_URL}/exhibitions/${ex.id}/publish`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(envelope(ex))
      }),
    )
    renderRoutes(editPath, ROUTES)
    const user = userEvent.setup()
    const toggle = await screen.findByRole('switch', { name: 'Published' })
    await user.click(toggle)
    await waitFor(() => expect(body).toEqual({ isPublished: true }))
    await user.type(screen.getByLabelText(/^Subtitle/), '!')
    expect(screen.getByRole('switch', { name: 'Published' })).toBeDisabled()
    expect(screen.getByRole('link', { name: 'View on site' })).toHaveAttribute('href', 'http://localhost:3100/exhibitions/tidewater')
  })

  it('deletes after confirmation and returns to the list', async () => {
    const ex = makeExhibition()
    useEditorHandlers(ex)
    let deleted = false
    server.use(
      http.delete(`${API_URL}/exhibitions/${ex.id}`, () => { deleted = true; return HttpResponse.json(envelope(null)) }),
      http.get(`${API_URL}/exhibitions`, () => HttpResponse.json({ ...envelope([]), meta: { total: 0, page: 1, limit: 20 } })),
    )
    const { router } = renderRoutes(editPath, ROUTES)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Delete exhibition' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete exhibition' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/exhibitions'))
    expect(deleted).toBe(true)
  })

  it('links news to the exhibition and lists linked press', async () => {
    const ex = makeExhibition()
    useEditorHandlers(ex)
    const item = { id: 'b1111111-1111-4111-8111-111111111111', title: 'Review: Tidewater', slug: 'review', exhibition: null }
    let patched: Record<string, unknown> = {}
    server.use(
      http.get(`${API_URL}/news`, () => HttpResponse.json(envelope([item, { ...item, id: 'b2', title: 'Linked piece', exhibition: { id: ex.id, title: ex.title, slug: ex.slug } }]))),
      http.get(`${API_URL}/news/${item.id}`, () =>
        HttpResponse.json(envelope({ ...item, excerpt: 'x', publishedAt: '2026-10-01T00:00:00.000Z', imageId: null, externalUrl: null, exhibitionId: null, isPublished: true })),
      ),
      http.patch(`${API_URL}/news/${item.id}`, async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(envelope({}))
      }),
    )
    renderRoutes(editPath, ROUTES)
    const user = userEvent.setup()
    expect(await screen.findByText('Linked piece')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Link news' }))
    await user.click(await screen.findByRole('button', { name: 'Link Review: Tidewater' }))
    await waitFor(() => expect(patched).toMatchObject({ exhibitionId: ex.id, title: item.title, slug: 'review', isPublished: true }))
  })
})
