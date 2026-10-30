import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { API_URL, HttpResponse, envelope, http, server } from '../../test/msw'
import ExhibitionEditorPage from './ExhibitionEditorPage'
import { ID, makeExhibition, renderRoutes, useEditorHandlers } from './testUtils'

describe('ArtistsPicker', () => {
  it('move up reorders and PUTs ids in order on save', async () => {
    const ex = makeExhibition()
    useEditorHandlers(ex)
    let put: unknown = null
    server.use(
      http.patch(`${API_URL}/exhibitions/${ex.id}`, () => HttpResponse.json(envelope(ex))),
      http.put(`${API_URL}/exhibitions/${ex.id}/artists`, async ({ request }) => {
        put = await request.json()
        return HttpResponse.json(envelope(ex))
      }),
    )
    renderRoutes(`/exhibitions/${ex.id}`, [{ path: '/exhibitions/:id', element: <ExhibitionEditorPage /> }])
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Move Ranjith Raman up' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(put).toEqual({ ids: [ID.a2, ID.a1, ID.a3] }))
  })

  it('adds a searched artist and removes one', async () => {
    const ex = makeExhibition()
    useEditorHandlers(ex)
    server.use(
      http.get(`${API_URL}/artists`, ({ request }) => {
        const q = new URL(request.url).searchParams.get('q')
        return HttpResponse.json(envelope(q ? [{ id: 'f4444444-4444-4444-8444-444444444444', name: 'Pradeep Unni', medium: 'Painting' }, { id: ID.a1, name: 'Parvathi Nayar' }] : []))
      }),
    )
    renderRoutes(`/exhibitions/${ex.id}`, [{ path: '/exhibitions/:id', element: <ExhibitionEditorPage /> }])
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Add artist'), 'pra')
    expect(screen.queryByRole('button', { name: 'Add Parvathi Nayar' })).not.toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Add Pradeep Unni' }))
    expect(await screen.findByRole('button', { name: 'Move Pradeep Unni up' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove P. Gopinath' }))
    expect(screen.queryByRole('button', { name: 'Move P. Gopinath up' })).not.toBeInTheDocument()
  })
})
