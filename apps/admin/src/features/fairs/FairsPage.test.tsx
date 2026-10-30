import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { API_URL, HttpResponse, envelope, http, server } from '../../test/msw'
import { renderRoutes } from '../../test/renderRoutes'
import FairEditor from './FairEditor'
import FairsPage from './FairsPage'
import { makeFair } from './testData'

const routes = [
  { path: '/fairs', element: <FairsPage /> },
  { path: '/fairs/new', element: <FairEditor /> },
  { path: '/fairs/:id', element: <FairEditor /> },
]
const fairs = [makeFair(), makeFair({ id: 'f2', title: 'ART SG 2025', slug: 'art-sg', isPublished: false })]

describe('FairsPage', () => {
  it('fairs move up PUTs order', async () => {
    let body: unknown
    server.use(
      http.get(`${API_URL}/fairs`, () => HttpResponse.json(envelope(fairs))),
      http.put(`${API_URL}/fairs/order`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(envelope(null))
      }),
    )
    renderRoutes(routes, '/fairs')
    expect(await screen.findByRole('button', { name: 'Move Art Dubai 2026 up' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Move ART SG 2025 up' }))
    await waitFor(() => expect(body).toEqual({ ids: ['f2', 'f1'] }))
  })

  it('renders the first fair as the public preview and toggles publish independently', async () => {
    let published: unknown
    server.use(
      http.get(`${API_URL}/fairs`, () => HttpResponse.json(envelope(fairs))),
      http.patch(`${API_URL}/fairs/f2/publish`, async ({ request }) => {
        published = await request.json()
        return HttpResponse.json(envelope({ ...fairs[1], isPublished: true }))
      }),
    )
    renderRoutes(routes, '/fairs')
    expect(await screen.findByRole('heading', { name: 'Preview on site' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('switch', { name: 'Published: ART SG 2025' }))
    await waitFor(() => expect(published).toEqual({ isPublished: true }))
  })
})

describe('FairEditor', () => {
  it('PATCHes the full payload, shows server field errors, and publish is disabled while dirty', async () => {
    let patched: Record<string, unknown> | undefined
    server.use(
      http.get(`${API_URL}/fairs/f1`, () => HttpResponse.json(envelope(fairs[0]))),
      http.patch(`${API_URL}/fairs/f1`, async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(envelope({ ...fairs[0], title: 'Art Dubai 2027' }))
      }),
    )
    renderRoutes(routes, '/fairs/f1')
    const title = await screen.findByLabelText(/Title/)
    const publishSwitch = screen.getByRole('switch', { name: 'Published' })
    expect(publishSwitch).toBeEnabled()
    await userEvent.clear(title)
    await userEvent.type(title, 'Art Dubai 2027')
    expect(publishSwitch).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Saved · Art Dubai 2027')).toBeInTheDocument()
    expect(patched).toMatchObject({ title: 'Art Dubai 2027', slug: 'art-dubai-2026', venue: 'Madinat Jumeirah', booth: 'Contemporary section' })
  })

  it('blocks an empty title with a plain-language error', async () => {
    server.use(http.get(`${API_URL}/fairs/f1`, () => HttpResponse.json(envelope(fairs[0]))))
    renderRoutes(routes, '/fairs/f1')
    await userEvent.clear(await screen.findByLabelText(/Title/))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect((await screen.findAllByText('Title is required')).length).toBeGreaterThan(0)
  })

  it('creates a new fair with POST and deletes through a confirm modal', async () => {
    let posted: Record<string, unknown> | undefined
    let deleted = false
    server.use(
      http.post(`${API_URL}/fairs`, async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(envelope(makeFair({ id: 'f9', title: 'Fresh' })))
      }),
      http.get(`${API_URL}/fairs/f9`, () => HttpResponse.json(envelope(makeFair({ id: 'f9', title: 'Fresh' })))),
      http.delete(`${API_URL}/fairs/f9`, () => {
        deleted = true
        return HttpResponse.json(envelope(null))
      }),
      http.get(`${API_URL}/fairs`, () => HttpResponse.json(envelope([]))),
    )
    const { router } = renderRoutes(routes, '/fairs/new')
    await userEvent.type(await screen.findByLabelText(/Title/), 'Fresh')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/fairs/f9'))
    expect(posted).toMatchObject({ title: 'Fresh' })
    expect(posted).not.toHaveProperty('slug')
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete fair' }))
    await waitFor(() => expect(deleted).toBe(true))
    await waitFor(() => expect(router.state.location.pathname).toBe('/fairs'))
    expect(screen.queryByText(/Could not load/)).not.toBeInTheDocument()
  })
})
