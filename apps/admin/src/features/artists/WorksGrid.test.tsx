import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { API_URL, HttpResponse, envelope, http, server } from '../../test/msw'
import { WorksGrid } from './WorksGrid'
import { makeArtwork, renderRoutes } from './testUtils'

const works = [makeArtwork(), makeArtwork({ id: 'w2', title: 'Kolam', year: '2025', sortOrder: 1 })]

function setup(disabled = false) {
  const calls: { method: string; path: string; body: unknown }[] = []
  server.use(
    http.get(`${API_URL}/artists/a1/artworks`, () => HttpResponse.json(envelope(works))),
    http.post(`${API_URL}/artists/a1/artworks`, async ({ request }) => {
      calls.push({ method: 'POST', path: '/artists/a1/artworks', body: await request.json() })
      return HttpResponse.json(envelope(makeArtwork({ id: 'w3' })), { status: 201 })
    }),
    http.patch(`${API_URL}/artworks/w1`, async ({ request }) => {
      calls.push({ method: 'PATCH', path: '/artworks/w1', body: await request.json() })
      return HttpResponse.json(envelope(works[0]))
    }),
    http.put(`${API_URL}/artists/a1/artworks/order`, async ({ request }) => {
      const body = (await request.json()) as { ids: string[] }
      calls.push({ method: 'PUT', path: '/artists/a1/artworks/order', body })
      return HttpResponse.json(envelope([works[1], works[0]]))
    }),
  )
  renderRoutes([{ path: '/', element: <WorksGrid artistId="a1" disabled={disabled} /> }], '/')
  return { calls }
}

describe('WorksGrid', () => {
  it('add tile has no description under its label', async () => {
    setup()
    const add = await screen.findByRole('button', { name: /Add work/ })
    expect(add).toHaveTextContent(/^Add work$/)
  })

  it('work dialog validates year as 4 digits', async () => {
    const { calls } = setup()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /Add work/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Add work' })
    await user.type(within(dialog).getByLabelText(/Title/), 'Salt Line')
    await user.type(within(dialog).getByLabelText('Year'), '20')
    await user.click(within(dialog).getByRole('button', { name: 'Save work' }))
    expect(await within(dialog).findAllByText('Enter a 4-digit year, for example 2026.')).not.toHaveLength(0)
    expect(calls).toHaveLength(0)
    await user.clear(within(dialog).getByLabelText('Year'))
    await user.type(within(dialog).getByLabelText('Year'), '2024')
    await user.click(within(dialog).getByRole('button', { name: 'Save work' }))
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0]!.body).toMatchObject({ title: 'Salt Line', year: '2024', imageId: null })
  })

  it('edits an existing work with its values prefilled and keeps its publish state', async () => {
    const { calls } = setup()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Edit Red Earth' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit work' })
    expect(within(dialog).getByLabelText(/Title/)).toHaveValue('Red Earth')
    expect(within(dialog).getByLabelText('Year')).toHaveValue('2026')
    await user.clear(within(dialog).getByLabelText(/Title/))
    await user.type(within(dialog).getByLabelText(/Title/), 'Red Earth II')
    await user.click(within(dialog).getByRole('button', { name: 'Save work' }))
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0]).toMatchObject({ method: 'PATCH', path: '/artworks/w1', body: { title: 'Red Earth II', isPublished: true } })
  })

  it('reorders with the move buttons and PUTs the full order', async () => {
    const { calls } = setup()
    await userEvent.click(await screen.findByRole('button', { name: 'Move Red Earth later' }))
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0]!.body).toEqual({ ids: ['w2', 'w1'] })
  })

  it('removing a work in use by an exhibition explains why it stays', async () => {
    setup()
    server.use(
      http.delete(`${API_URL}/artworks/w1`, () =>
        HttpResponse.json({ ok: false, data: null, error: { code: 'ARTWORK_IN_USE', message: 'in use', details: { workCount: 2 } } }, { status: 409 }),
      ),
    )
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Remove Red Earth' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Remove' }))
    expect(await screen.findByRole('alertdialog', { name: /still in use/i })).toBeInTheDocument()
  })

  it('is disabled until the artist is saved', async () => {
    server.use(http.get(`${API_URL}/artists/a1/artworks`, () => HttpResponse.json(envelope([]))))
    renderRoutes([{ path: '/', element: <WorksGrid artistId={null} disabled /> }], '/')
    expect(screen.getByText('Save the artist first')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Add work/ })).toBeDisabled()
  })
})
