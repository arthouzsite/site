import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { API_URL, HttpResponse, envelope, http, server } from '../../test/msw'
import { WorkDialog } from './WorkDialog'
import { WorksCard } from './WorksCard'
import type { ArtistLite } from './types'
import { ID, makeWork, renderWithProviders } from './testUtils'

const artists: ArtistLite[] = [
  { id: ID.a1, name: 'Parvathi Nayar' },
  { id: ID.a2, name: 'Ranjith Raman' },
]

describe('WorkDialog', () => {
  it("artist select offers only the exhibition's artists", async () => {
    renderWithProviders(<WorkDialog open onClose={() => {}} exhibitionId={ID.ex} artists={artists} />)
    const select = await screen.findByLabelText(/Artist/)
    const options = within(select).getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual(['Choose artist', 'Parvathi Nayar', 'Ranjith Raman'])
  })

  it('asks for the missing fields instead of posting', async () => {
    let posted = false
    server.use(http.post(`${API_URL}/exhibitions/${ID.ex}/works`, () => { posted = true; return HttpResponse.json(envelope({})) }))
    renderWithProviders(<WorkDialog open onClose={() => {}} exhibitionId={ID.ex} artists={artists} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Add work' }))
    expect(await screen.findByText('Enter a title')).toBeInTheDocument()
    expect(screen.getByText('Choose an image')).toBeInTheDocument()
    expect(screen.getByText('Choose an artist')).toBeInTheDocument()
    expect(posted).toBe(false)
  })
})

describe('WorksCard', () => {
  it('is disabled until the exhibition exists', () => {
    renderWithProviders(<WorksCard exhibitionId={undefined} artists={[]} />)
    expect(screen.getByText('Save the exhibition first')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add work' })).toBeDisabled()
  })

  it('ImportWorkDialog posts the artwork id and the new work appears in the list', async () => {
    let works = [makeWork()]
    let body: unknown = null
    server.use(
      http.get(`${API_URL}/exhibitions/${ID.ex}/works`, () => HttpResponse.json(envelope(works))),
      http.get(`${API_URL}/artists/${ID.a1}/artworks`, () =>
        HttpResponse.json(envelope([{ id: ID.artwork1, title: 'Dawn Tide', year: '2025', medium: 'Oil', size: '', image: null }])),
      ),
      http.get(`${API_URL}/artists/${ID.a2}/artworks`, () => HttpResponse.json(envelope([]))),
      http.post(`${API_URL}/exhibitions/${ID.ex}/works/import`, async ({ request }) => {
        body = await request.json()
        works = [...works, makeWork({ id: ID.a3, title: 'Dawn Tide', artworkId: ID.artwork1, sortOrder: 1 })]
        return HttpResponse.json(envelope(works[1]))
      }),
    )
    renderWithProviders(<WorksCard exhibitionId={ID.ex} artists={artists} />)
    const user = userEvent.setup()
    expect(await screen.findByText('Ledger of Rivers')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: "Import from artist's works" }))
    await user.click(await screen.findByRole('button', { name: 'Import Dawn Tide' }))
    await waitFor(() => expect(body).toEqual({ artworkId: ID.artwork1 }))
    const list = screen.getByRole('list', { name: 'Works in the exhibition' })
    expect(await within(list).findByText('Dawn Tide')).toBeInTheDocument()
    expect(await screen.findByText('Added')).toBeInTheDocument()
  })

  it('reorders with the move buttons and removes a work', async () => {
    const w1 = makeWork()
    const w2 = makeWork({ id: ID.a3, title: 'Still Water', sortOrder: 1 })
    let order: unknown = null
    let removed = ''
    server.use(
      http.get(`${API_URL}/exhibitions/${ID.ex}/works`, () => HttpResponse.json(envelope([w1, w2]))),
      http.put(`${API_URL}/exhibitions/${ID.ex}/works/order`, async ({ request }) => {
        order = await request.json()
        return HttpResponse.json(envelope(null))
      }),
      http.delete(`${API_URL}/works/${ID.a3}`, () => { removed = ID.a3; return HttpResponse.json(envelope(null)) }),
    )
    renderWithProviders(<WorksCard exhibitionId={ID.ex} artists={artists} />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Move Still Water up' }))
    await waitFor(() => expect(order).toEqual({ ids: [ID.a3, ID.work1] }))
    await user.click(screen.getByRole('button', { name: 'Remove Still Water' }))
    await user.click(await screen.findByRole('button', { name: 'Remove work' }))
    await waitFor(() => expect(removed).toBe(ID.a3))
  })
})
