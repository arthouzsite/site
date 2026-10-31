import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { API_URL, HttpResponse, envelope, http, server } from '../../test/msw'
import { renderRoutes } from '../../test/renderRoutes'
import LocationsPage from './LocationsPage'
import { makeLocation } from './testData'

const locations = [makeLocation(), makeLocation({ id: 'l2', slug: 'bengaluru', city: 'Bengaluru', tel: '+919886112400' })]
const mount = () => renderRoutes([{ path: '/locations', element: <LocationsPage /> }], '/locations')
const card = (name: string) => screen.getByRole('region', { name })

describe('LocationsPage', () => {
  it('location tel field rejects non E.164 inline', async () => {
    let patched = false
    server.use(
      http.get(`${API_URL}/locations`, () => HttpResponse.json(envelope(locations))),
      http.patch(`${API_URL}/locations/l1`, () => {
        patched = true
        return HttpResponse.json(envelope(locations[0]))
      }),
    )
    mount()
    await screen.findByRole('region', { name: 'Chennai' })
    const tel = within(card('Chennai')).getByLabelText('Tel')
    await userEvent.clear(tel)
    await userEvent.type(tel, '73977 45684')
    await userEvent.click(within(card('Chennai')).getByRole('button', { name: 'Save' }))
    expect((await within(card('Chennai')).findAllByText('Use international format, e.g. +914412345678')).length).toBeGreaterThan(0)
    expect(tel).toHaveAttribute('aria-invalid', 'true')
    expect(patched).toBe(false)
  })

  it('locations save per card', async () => {
    const bodies: Record<string, Record<string, unknown>> = {}
    server.use(
      http.get(`${API_URL}/locations`, () => HttpResponse.json(envelope(locations))),
      http.patch(`${API_URL}/locations/:id`, async ({ request, params }) => {
        bodies[params.id as string] = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(envelope({ ...locations[1], hours: '9 am' }))
      }),
    )
    mount()
    await screen.findByRole('region', { name: 'Bengaluru' })
    const hours = within(card('Bengaluru')).getByLabelText('Hours')
    await userEvent.clear(hours)
    await userEvent.type(hours, '9 am')
    await userEvent.click(within(card('Bengaluru')).getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Saved · Bengaluru')).toBeInTheDocument()
    expect(Object.keys(bodies)).toEqual(['l2'])
    expect(bodies.l2).toMatchObject({ city: 'Bengaluru', hours: '9 am', tel: '+919886112400', slug: 'bengaluru', mapUrl: 'https://maps.example/chennai' })
  })

  it('reorders with disabled end buttons and PUTs the new id list', async () => {
    let body: unknown
    server.use(
      http.get(`${API_URL}/locations`, () => HttpResponse.json(envelope(locations))),
      http.put(`${API_URL}/locations/order`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(envelope(null))
      }),
    )
    mount()
    expect(await screen.findByRole('button', { name: 'Move Chennai up' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move Bengaluru down' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Move Chennai down' }))
    await waitFor(() => expect(body).toEqual({ ids: ['l2', 'l1'] }))
  })

  it('adds a new card that POSTs on first save, and shows the appearance rule', async () => {
    let posted: Record<string, unknown> | undefined
    server.use(
      http.get(`${API_URL}/locations`, () => HttpResponse.json(envelope([]))),
      http.post(`${API_URL}/locations`, async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(envelope(makeLocation({ id: 'l9', city: 'Mumbai' })))
      }),
    )
    mount()
    await userEvent.click(await screen.findByRole('button', { name: 'Add location' }))
    const fresh = card('New location')
    await userEvent.type(within(fresh).getByLabelText(/City/), 'Mumbai')
    await userEvent.click(within(fresh).getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Saved · Mumbai')).toBeInTheDocument()
    expect(posted).toMatchObject({ city: 'Mumbai', tel: '' })
    expect(screen.getByText('Footer hours')).toBeInTheDocument()
  })

  it('deletes through a confirm modal', async () => {
    let deleted = false
    server.use(
      http.get(`${API_URL}/locations`, () => HttpResponse.json(envelope(locations))),
      http.delete(`${API_URL}/locations/l1`, () => {
        deleted = true
        return HttpResponse.json(envelope(null))
      }),
    )
    mount()
    await screen.findByRole('region', { name: 'Chennai' })
    await userEvent.click(within(card('Chennai')).getByRole('button', { name: 'Delete' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete location' }))
    await waitFor(() => expect(deleted).toBe(true))
  })

  it('renders the map test link only for http(s) URLs', async () => {
    server.use(http.get(`${API_URL}/locations`, () => HttpResponse.json(envelope([locations[0], makeLocation({ id: 'l2', city: 'Bengaluru', mapUrl: 'javascript:alert(1)' })]))))
    mount()
    await screen.findByRole('region', { name: 'Bengaluru' })
    const link = within(card('Chennai')).getByRole('link', { name: 'Test ↗' })
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(within(card('Bengaluru')).queryByRole('link', { name: 'Test ↗' })).not.toBeInTheDocument()
  })
})
