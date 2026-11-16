import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { API_URL, HttpResponse, envelope, http, server } from '../../test/msw'
import { renderRoutes } from '../../test/renderRoutes'
import FairEditor from './FairEditor'
import FairsPage from './FairsPage'
import { makeMedia } from '../media/testUtils'
import { toMediaRef } from '../media/types'
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

describe('FairEditor gallery', () => {
  const uid = (tag: string, i = 0) => `3f2b8c1e-8a52-4f0e-9d3b-${tag}${String(i).padStart(12 - tag.length, '0')}`
  const refs = (n: number) => Array.from({ length: n }, (_, i) => toMediaRef(makeMedia({ id: uid('a', i), key: `media/g${i}.jpg`, alt: `Gallery ${i}` })))
  const pool = [makeMedia({ id: uid('b'), key: 'media/fresh.jpg', alt: 'Fresh' }), makeMedia({ id: uid('a', 0), key: 'media/g0.jpg', alt: 'Gallery 0' })]
  const serve = (fair = makeFair({ gallery: refs(2) })) =>
    server.use(
      http.get(`${API_URL}/fairs/f1`, () => HttpResponse.json(envelope(fair))),
      http.get(`${API_URL}/media`, () => HttpResponse.json({ ...envelope(pool), meta: { total: pool.length, page: 1, limit: 12 } })),
    )
  const pick = async (key: RegExp) => {
    await userEvent.click(screen.getByRole('button', { name: 'Add gallery image' }))
    await userEvent.click(await screen.findByRole('option', { name: key }))
    await userEvent.click(screen.getByRole('button', { name: 'Use this image' }))
  }

  it('shows the count against the limit and the images in order', async () => {
    serve()
    renderRoutes(routes, '/fairs/f1')
    expect(await screen.findByText('2 of 15')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Gallery images' }).querySelectorAll('li')).toHaveLength(2)
  })

  it('adds an image from the media picker and saves the ordered ids', async () => {
    let patched: Record<string, unknown> | undefined
    serve()
    server.use(
      http.patch(`${API_URL}/fairs/f1`, async ({ request }) => {
        patched = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(envelope(makeFair()))
      }),
    )
    renderRoutes(routes, '/fairs/f1')
    await screen.findByText('2 of 15')
    await pick(/fresh\.jpg/i)
    expect(await screen.findByText('3 of 15')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Move Gallery 0 down' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(patched?.galleryImageIds).toEqual([uid('a', 1), uid('a', 0), uid('b')]))
  })

  it('removes an image after confirming, without a native dialog', async () => {
    const confirm = vi.spyOn(window, 'confirm')
    serve()
    renderRoutes(routes, '/fairs/f1')
    await screen.findByText('2 of 15')
    await userEvent.click(screen.getByRole('button', { name: 'Remove Gallery 0' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove image' }))
    expect(await screen.findByText('1 of 15')).toBeInTheDocument()
    expect(confirm).not.toHaveBeenCalled()
  })

  it('blocks adding past 15 with an error and never opens the picker', async () => {
    serve(makeFair({ gallery: refs(15) }))
    renderRoutes(routes, '/fairs/f1')
    expect(await screen.findByText('15 of 15')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Add gallery image' }))
    expect(await screen.findByText('A fair gallery holds at most 15 images')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Choose image' })).not.toBeInTheDocument()
    expect(screen.getByText('15 of 15')).toBeInTheDocument()
  })

  it('refuses an image that is already in the gallery', async () => {
    serve()
    renderRoutes(routes, '/fairs/f1')
    await screen.findByText('2 of 15')
    await pick(/g0\.jpg/i)
    expect(await screen.findByText('That image is already in the gallery')).toBeInTheDocument()
    expect(screen.getByText('2 of 15')).toBeInTheDocument()
  })

  it('lets a new fair collect gallery images before its first save', async () => {
    let posted: Record<string, unknown> | undefined
    server.use(
      http.get(`${API_URL}/media`, () => HttpResponse.json({ ...envelope(pool), meta: { total: pool.length, page: 1, limit: 12 } })),
      http.post(`${API_URL}/fairs`, async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(envelope(makeFair({ id: 'f9' })))
      }),
      http.get(`${API_URL}/fairs/f9`, () => HttpResponse.json(envelope(makeFair({ id: 'f9' })))),
    )
    renderRoutes(routes, '/fairs/new')
    expect(await screen.findByText('0 of 15')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/Title/), 'Fresh')
    await pick(/fresh\.jpg/i)
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(posted?.galleryImageIds).toEqual([uid('b')]))
  })
})
