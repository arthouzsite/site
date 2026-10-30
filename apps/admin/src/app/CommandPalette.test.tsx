import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import { makeArtist } from '../features/artists/testUtils'
import { ID, makeExhibition } from '../features/exhibitions/testUtils'
import { makeFair } from '../features/fairs/testData'
import { makeNews } from '../features/news/testData'
import { API_URL, HttpResponse, envelope, http, server } from '../test/msw'
import { renderRoutes } from '../test/renderRoutes'
import { Topbar } from './Topbar'

const user = { id: '1', email: 'p@x.com', name: 'Priya Raman', role: 'EDITOR' as const }

function Where() {
  return <output aria-label="location">{useLocation().pathname}</output>
}

function stubSearch(overrides: { news?: () => Response } = {}) {
  const requests: Array<{ path: string; q: string | null; limit: string | null }> = []
  const record = (path: string, request: Request) => {
    const url = new URL(request.url)
    requests.push({ path, q: url.searchParams.get('q'), limit: url.searchParams.get('limit') })
  }
  server.use(
    http.get(`${API_URL}/exhibitions`, ({ request }) => {
      record('exhibitions', request)
      const q = new URL(request.url).searchParams.get('q')
      return HttpResponse.json(envelope(q === 'zzz' ? [] : [makeExhibition(), makeExhibition({ id: ID.a2, title: 'Tidewater II', isPublished: false })]))
    }),
    http.get(`${API_URL}/artists`, ({ request }) => {
      record('artists', request)
      const q = new URL(request.url).searchParams.get('q')
      return HttpResponse.json(envelope(q === 'zzz' ? [] : [makeArtist({ id: 'a1', name: 'Tide Walker' })]))
    }),
    http.get(`${API_URL}/news`, ({ request }) => {
      record('news', request)
      if (overrides.news) return overrides.news()
      const q = new URL(request.url).searchParams.get('q')
      return HttpResponse.json(envelope(q === 'zzz' ? [] : [makeNews({ id: 'n1', title: 'Tidewater reviewed' })]))
    }),
    // The fairs endpoint takes no search parameters, so the palette filters its full list.
    http.get(`${API_URL}/fairs`, ({ request }) => {
      record('fairs', request)
      return HttpResponse.json(envelope([makeFair({ id: 'f1', title: 'Tide Fair', isPublished: false }), makeFair({ id: 'f2', title: 'Art Dubai 2026' })]))
    }),
  )
  return requests
}

function setup(overrides?: Parameters<typeof stubSearch>[0]) {
  const requests = stubSearch(overrides)
  const view = renderRoutes([{ path: '*', element: <><Topbar user={user} onLogout={() => {}} /><Where /></> }], '/')
  const button = screen.getByRole('button', { name: 'Search all content' })
  return { requests, button, ...view }
}

const searchBox = () => screen.findByRole('combobox', { name: 'Search records' })
const where = () => screen.getByRole('status', { name: 'location' })

describe('command palette', () => {
  it('opens from the button and from ⌘K or Ctrl+K, focusing the search box', async () => {
    const { button } = setup()
    const u = userEvent.setup()
    await u.click(button)
    expect(await searchBox()).toHaveFocus()
    await u.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await u.keyboard('{Meta>}k{/Meta}')
    expect(await searchBox()).toHaveFocus()
    await u.keyboard('{Escape}')
    await u.keyboard('{Control>}k{/Control}')
    expect(await searchBox()).toHaveFocus()
  })

  it('searches all four record types with a limit of 5, after a 200 ms pause and two characters', async () => {
    const { requests, button } = setup()
    const u = userEvent.setup()
    await u.click(button)
    await u.type(await searchBox(), 't')
    await new Promise((r) => setTimeout(r, 350))
    expect(requests).toEqual([])
    await u.type(screen.getByRole('combobox'), 'ide')
    await waitFor(() => expect(new Set(requests.map((r) => r.path))).toEqual(new Set(['exhibitions', 'artists', 'news', 'fairs'])))
    for (const r of requests.filter((x) => x.path !== 'fairs')) expect(r).toEqual({ path: r.path, q: 'tide', limit: '5' })
  })

  it('lists results grouped by type with titles and status chips', async () => {
    const { button } = setup()
    const u = userEvent.setup()
    await u.click(button)
    await u.type(await searchBox(), 'tide')
    const exhibitions = await screen.findByRole('group', { name: 'Exhibitions' })
    expect(within(exhibitions).getAllByRole('option').map((o) => o.textContent)).toEqual(['TidewaterNow on view', 'Tidewater IINow on viewDraft'])
    expect(within(screen.getByRole('group', { name: 'Artists' })).getByRole('option')).toHaveTextContent('Tide WalkerPublished')
    expect(within(screen.getByRole('group', { name: 'News' })).getByRole('option')).toHaveTextContent('Tidewater reviewedPublished')
    const fairs = screen.getByRole('group', { name: 'Fairs' })
    expect(within(fairs).getAllByRole('option')).toHaveLength(1)
    expect(fairs).toHaveTextContent('Tide FairDraft')
    expect(screen.queryByText('Art Dubai 2026')).not.toBeInTheDocument()
  })

  it('moves with the arrow keys and opens the highlighted record on Enter', async () => {
    const { button } = setup()
    const u = userEvent.setup()
    await u.click(button)
    const box = await searchBox()
    await u.type(box, 'tide')
    await screen.findByRole('group', { name: 'Fairs' })
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true')
    expect(box).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[0]!.id)
    await u.keyboard('{ArrowDown}{ArrowDown}')
    expect(screen.getAllByRole('option')[2]).toHaveAttribute('aria-selected', 'true')
    await u.keyboard('{ArrowUp}')
    await u.keyboard('{Enter}')
    expect(where()).toHaveTextContent(`/exhibitions/${ID.a2}`)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens a record on click', async () => {
    const { button } = setup()
    const u = userEvent.setup()
    await u.click(button)
    await u.type(await searchBox(), 'tide')
    await u.click(await screen.findByRole('option', { name: /Tide Walker/ }))
    expect(where()).toHaveTextContent('/artists/a1')
  })

  it('Escape closes it and returns focus to the search button', async () => {
    const { button } = setup()
    const u = userEvent.setup()
    await u.click(button)
    await searchBox()
    await u.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(button).toHaveFocus()
    await u.keyboard('{Meta>}k{/Meta}')
    await searchBox()
    await u.keyboard('{Escape}')
    expect(button).toHaveFocus()
  })

  it('leaves ⌘K alone while another dialog is open', async () => {
    setup()
    const modal = document.createElement('div')
    modal.setAttribute('aria-modal', 'true')
    document.body.append(modal)
    await userEvent.keyboard('{Meta>}k{/Meta}')
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    modal.remove()
  })

  it('says when nothing matches', async () => {
    const { button } = setup()
    const u = userEvent.setup()
    await u.click(button)
    await u.type(await searchBox(), 'zzz')
    expect(await screen.findByText('Nothing found for “zzz”')).toBeInTheDocument()
  })

  it('shows what failed inline and keeps the other results', async () => {
    const { button } = setup({ news: () => HttpResponse.json({ ok: false, data: null, error: { code: 'INTERNAL', message: 'boom' } }, { status: 500 }) })
    const u = userEvent.setup()
    await u.click(button)
    await u.type(await searchBox(), 'tide')
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not search News.')
    expect(screen.getByRole('group', { name: 'Artists' })).toBeInTheDocument()
    expect(screen.queryByText(/Nothing found/)).not.toBeInTheDocument()
  })

  it('clears the search when reopened', async () => {
    const { button } = setup()
    const u = userEvent.setup()
    await u.click(button)
    await u.type(await searchBox(), 'tide')
    await screen.findByRole('group', { name: 'Artists' })
    await u.keyboard('{Escape}')
    await u.click(button)
    expect(await searchBox()).toHaveValue('')
  })
})
