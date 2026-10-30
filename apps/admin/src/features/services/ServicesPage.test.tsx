import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { API_URL, HttpResponse, envelope, errorEnvelope, http, server } from '../../test/msw'
import { renderRoutes } from '../../test/renderRoutes'
import ServiceEditor from './ServiceEditor'
import ServicesPage from './ServicesPage'
import { makeService } from './testData'

const routes = [
  { path: '/services', element: <ServicesPage /> },
  { path: '/services/new', element: <ServiceEditor /> },
  { path: '/services/:id', element: <ServiceEditor /> },
]
const services = [makeService(), makeService({ id: 's2', title: 'Art for rent', slug: 'art-for-rent', summary: 'x'.repeat(200), isPublished: false })]
const withMeta = <T,>(data: T[], total = data.length) => ({ ...envelope(data), meta: { page: 1, limit: 200, total } })

describe('ServicesPage', () => {
  it('lists services with a truncated summary and an Add service button', async () => {
    server.use(http.get(`${API_URL}/services`, () => HttpResponse.json(withMeta(services))))
    renderRoutes(routes, '/services')
    expect(await screen.findByRole('link', { name: 'Art sales' })).toHaveAttribute('href', '/services/s1')
    expect(screen.getByRole('link', { name: 'Add service' })).toHaveAttribute('href', '/services/new')
    expect(screen.getByText(`${'x'.repeat(100)}…`)).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Published: Art sales' })).toBeChecked()
  })

  it('move down PUTs the full order and the first/last moves are disabled', async () => {
    let body: unknown
    server.use(
      http.get(`${API_URL}/services`, () => HttpResponse.json(withMeta(services))),
      http.put(`${API_URL}/services/order`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(envelope(null))
      }),
    )
    renderRoutes(routes, '/services')
    expect(await screen.findByRole('button', { name: 'Move Art sales up' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move Art for rent down' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Move Art sales down' }))
    await waitFor(() => expect(body).toEqual({ ids: ['s2', 's1'] }))
  })

  it('disables reordering while a search narrows the list', async () => {
    server.use(http.get(`${API_URL}/services`, () => HttpResponse.json(withMeta([services[1]!]))))
    renderRoutes(routes, '/services?q=rent')
    expect(await screen.findByRole('button', { name: 'Move Art for rent up' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move Art for rent down' })).toBeDisabled()
  })

  it('toggles publish for one row and reports a failure', async () => {
    let published: unknown
    server.use(
      http.get(`${API_URL}/services`, () => HttpResponse.json(withMeta(services))),
      http.patch(`${API_URL}/services/s2/publish`, async ({ request }) => {
        published = await request.json()
        return HttpResponse.json(envelope({ ...services[1], isPublished: true }))
      }),
      http.patch(`${API_URL}/services/s1/publish`, () => HttpResponse.json(errorEnvelope('FORBIDDEN', 'Not allowed'), { status: 403 })),
    )
    renderRoutes(routes, '/services')
    await userEvent.click(await screen.findByRole('switch', { name: 'Published: Art for rent' }))
    await waitFor(() => expect(published).toEqual({ isPublished: true }))
    await userEvent.click(screen.getByRole('switch', { name: 'Published: Art sales' }))
    expect(await screen.findByText('Not allowed')).toBeInTheDocument()
  })

  it('searches through the q parameter after a pause and shows the empty state', async () => {
    const queries: Array<string | null> = []
    server.use(http.get(`${API_URL}/services`, ({ request }) => {
      const q = new URL(request.url).searchParams.get('q')
      queries.push(q)
      return HttpResponse.json(withMeta(q ? [] : services))
    }))
    const { router } = renderRoutes(routes, '/services')
    await screen.findByRole('link', { name: 'Art sales' })
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search services' }), 'zzz')
    expect(await screen.findByText('No services match.')).toBeInTheDocument()
    expect(queries).toContain('zzz')
    expect(router.state.location.search).toBe('?q=zzz')
  })

  it('shows a pager when the list spans pages', async () => {
    server.use(http.get(`${API_URL}/services`, () => HttpResponse.json(withMeta(services, 450))))
    renderRoutes(routes, '/services')
    expect(await screen.findByRole('link', { name: 'Art sales' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
  })

  it('says when the list failed to load', async () => {
    server.use(http.get(`${API_URL}/services`, () => HttpResponse.json(errorEnvelope('INTERNAL', 'boom'), { status: 500 })))
    renderRoutes(routes, '/services')
    expect(await screen.findByText('Could not load services. Try again.')).toBeInTheDocument()
  })
})

describe('ServiceEditor', () => {
  it('PATCHes the full payload, keeps publish disabled while dirty and links to the live page', async () => {
    let patched: Record<string, unknown> | undefined
    server.use(
      http.get(`${API_URL}/services/s1`, () => HttpResponse.json(envelope(services[0]))),
      http.patch(`${API_URL}/services/s1`, async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(envelope({ ...services[0], title: 'Art sales 2' }))
      }),
    )
    renderRoutes(routes, '/services/s1')
    const title = await screen.findByLabelText(/Title/)
    expect(screen.getByRole('link', { name: 'View on site' })).toHaveAttribute('href', 'http://localhost:3100/services/art-sales')
    expect(screen.getByRole('region', { name: 'Sales contact' })).toBeInTheDocument()
    const publishSwitch = screen.getByRole('switch', { name: 'Published' })
    expect(publishSwitch).toBeEnabled()
    await userEvent.clear(title)
    await userEvent.type(title, 'Art sales 2')
    expect(publishSwitch).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Saved · Art sales 2')).toBeInTheDocument()
    expect(patched).toMatchObject({ title: 'Art sales 2', slug: 'art-sales', ctaLabel: 'Enquire →', ctaHref: '', contactEmail: '' })
    expect(patched).not.toHaveProperty('isPublished')
  })

  it('blocks an empty title and a bad contact email with plain-language errors', async () => {
    server.use(http.get(`${API_URL}/services/s1`, () => HttpResponse.json(envelope(services[0]))))
    renderRoutes(routes, '/services/s1')
    await userEvent.clear(await screen.findByLabelText(/Title/))
    await userEvent.type(screen.getByLabelText('Email'), 'nope')
    await userEvent.type(screen.getByLabelText('Phone'), '12')
    await userEvent.type(screen.getByLabelText(/CTA link/), 'ftp://x')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect((await screen.findAllByText('Title is required')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Invalid email address').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Use international format, e.g. +914412345678').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Use an http(s) link, mailto:name@example.com or tel:+914412345678').length).toBeGreaterThan(0)
  })

  it('shows field errors from the API VALIDATION envelope', async () => {
    server.use(
      http.get(`${API_URL}/services/s1`, () => HttpResponse.json(envelope(services[0]))),
      http.patch(`${API_URL}/services/s1`, () => HttpResponse.json(errorEnvelope('VALIDATION', 'Check the highlighted fields', { slug: 'That slug is already in use' }), { status: 422 })),
    )
    renderRoutes(routes, '/services/s1')
    await userEvent.type(await screen.findByLabelText(/Summary/), ' More.')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect((await screen.findAllByText('That slug is already in use')).length).toBeGreaterThan(0)
  })

  it('creates a service with POST, omitting an untouched slug, then deletes through a confirm modal', async () => {
    let posted: Record<string, unknown> | undefined
    let deleted = false
    server.use(
      http.post(`${API_URL}/services`, async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(envelope(makeService({ id: 's9', title: 'Fresh' })))
      }),
      http.get(`${API_URL}/services/s9`, () => HttpResponse.json(envelope(makeService({ id: 's9', title: 'Fresh' })))),
      http.delete(`${API_URL}/services/s9`, () => {
        deleted = true
        return HttpResponse.json(envelope({ id: 's9' }))
      }),
      http.get(`${API_URL}/services`, () => HttpResponse.json(withMeta([]))),
    )
    const { router } = renderRoutes(routes, '/services/new')
    expect(screen.queryByRole('link', { name: 'View on site' })).not.toBeInTheDocument()
    expect(screen.getByLabelText(/CTA label/)).toHaveValue('Enquire →')
    expect(screen.getByText('Leave empty to point at the Visit page')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/Title/), 'Fresh')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/services/s9'))
    expect(posted).toMatchObject({ title: 'Fresh', ctaLabel: 'Enquire →', imageId: null })
    expect(posted).not.toHaveProperty('slug')
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete service' }))
    await waitFor(() => expect(deleted).toBe(true))
    await waitFor(() => expect(router.state.location.pathname).toBe('/services'))
  })

  it('publishes from the editor and reports a failed delete without leaving the page', async () => {
    let published: unknown
    server.use(
      http.get(`${API_URL}/services/s2`, () => HttpResponse.json(envelope(services[1]))),
      http.patch(`${API_URL}/services/s2/publish`, async ({ request }) => {
        published = await request.json()
        return HttpResponse.json(envelope({ ...services[1], isPublished: true }))
      }),
      http.delete(`${API_URL}/services/s2`, () => HttpResponse.json(errorEnvelope('CONFLICT', 'Cannot delete right now'), { status: 409 })),
    )
    const { router } = renderRoutes(routes, '/services/s2')
    expect(await screen.findByText('Draft')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('switch', { name: 'Published' }))
    await waitFor(() => expect(published).toEqual({ isPublished: true }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete service' }))
    expect(await screen.findByText('Cannot delete right now')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/services/s2')
  })

  it('says when the service could not be loaded', async () => {
    server.use(http.get(`${API_URL}/services/s404`, () => HttpResponse.json(errorEnvelope('NOT_FOUND', 'Service not found'), { status: 404 })))
    renderRoutes(routes, '/services/s404')
    expect(await screen.findByText('Could not load this service.')).toBeInTheDocument()
  })
})
