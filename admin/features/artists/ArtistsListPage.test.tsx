import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { API_URL, HttpResponse, envelope, errorEnvelope, http, server } from '../../test/msw'
import ArtistsListPage from './ArtistsListPage'
import { makeArtist, renderRoutes } from './testUtils'

const alpha = makeArtist({ id: 'a1', name: 'Alpha Artist' })
const beta = makeArtist({ id: 'a2', name: 'Beta Artist', sortName: 'Beta Artist', indexLetter: 'B' })
const gamma = makeArtist({ id: 'a3', name: 'Gamma Artist', sortName: 'Gamma Artist', indexLetter: 'G', isPublished: false })

function setup(initial = '/artists') {
  const listRequests: URL[] = []
  server.use(
    http.get(`${API_URL}/artists`, ({ request }) => {
      const url = new URL(request.url)
      listRequests.push(url)
      return HttpResponse.json({ ...envelope([alpha, beta, gamma]), meta: { total: 3, page: 1, limit: 20 } })
    }),
  )
  const view = renderRoutes([{ path: '/artists', element: <ArtistsListPage /> }], initial)
  return { listRequests, ...view }
}

describe('ArtistsListPage', () => {
  it('lists artists with works and published state', async () => {
    setup()
    const table = await screen.findByRole('table', { name: 'Artists' })
    expect(await within(table).findByRole('link', { name: 'Alpha Artist' })).toHaveAttribute('href', '/artists/a1')
    expect(within(table).getByRole('switch', { name: 'Published: Gamma Artist' })).not.toBeChecked()
  })

  it('letter strip sets ?letter=', async () => {
    const { router, listRequests } = setup()
    await screen.findByRole('table', { name: 'Artists' })
    await userEvent.click(screen.getByRole('button', { name: 'K' }))
    expect(router.state.location.search).toContain('letter=K')
    await waitFor(() => expect(listRequests.at(-1)!.searchParams.get('letter')).toBe('K'))
    expect(screen.getByRole('button', { name: 'K' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'K' }))
    expect(router.state.location.search).not.toContain('letter')
  })

  it('syncs the published filter to the URL and offers no featured controls', async () => {
    const { router, listRequests } = setup()
    await screen.findByRole('table', { name: 'Artists' })
    expect(screen.queryByLabelText('Featured')).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Featured' })).not.toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText('Published'), 'true')
    await waitFor(() => expect(listRequests.at(-1)!.searchParams.get('published')).toBe('true'))
    expect(router.state.location.search).toContain('published=true')
  })

  it('delete artist 409 shows the exhibitions that block it', async () => {
    setup()
    server.use(
      http.delete(`${API_URL}/artists/a1`, () =>
        HttpResponse.json(
          { ...errorEnvelope('ARTIST_IN_USE', 'Artist is used by exhibitions or has artworks'), error: {
            code: 'ARTIST_IN_USE',
            message: 'in use',
            details: { exhibitions: [{ id: 'e1', title: 'Naan Yaar' }], workCount: 3, artworkCount: 2 },
          } },
          { status: 409 },
        ),
      ),
    )
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Delete Alpha Artist' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('alertdialog', { name: /can.t be deleted/i })
    expect(within(dialog).getByText('Remove the artist from:')).toBeInTheDocument()
    expect(within(dialog).getByText('Naan Yaar')).toBeInTheDocument()
    expect(within(dialog).getByText('Delete 2 selected works.')).toBeInTheDocument()
    expect(within(dialog).getByText('3 exhibition works use this artist.')).toBeInTheDocument()
  })

  it('delete guard lists only the blocking parts that exist', async () => {
    setup()
    server.use(
      http.delete(`${API_URL}/artists/a1`, () =>
        HttpResponse.json(
          { ok: false, data: null, error: { code: 'ARTIST_IN_USE', message: 'in use', details: { exhibitions: [], workCount: 0, artworkCount: 2 } } },
          { status: 409 },
        ),
      ),
    )
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Delete Alpha Artist' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('alertdialog', { name: /can.t be deleted/i })
    expect(within(dialog).getByText('Delete 2 selected works.')).toBeInTheDocument()
    expect(within(dialog).queryByText('Remove the artist from:')).not.toBeInTheDocument()
    expect(within(dialog).queryByText(/exhibition works?/)).not.toBeInTheDocument()
  })

  it('the letter strip offers A to Z only, with no # bucket', async () => {
    setup()
    await screen.findByRole('table', { name: 'Artists' })
    const strip = screen.getByRole('navigation', { name: 'Jump to letter' })
    expect(within(strip).getAllByRole('button')).toHaveLength(26)
    expect(within(strip).queryByRole('button', { name: '#' })).not.toBeInTheDocument()
  })
})
