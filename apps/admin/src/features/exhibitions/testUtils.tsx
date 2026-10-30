import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { ToastProvider } from '../../lib/toast'
import { API_URL, HttpResponse, envelope, http, server } from '../../test/msw'
import type { AdminExhibition, ExhibitionWork } from './types'

export const ID = {
  ex: '11111111-1111-4111-8111-111111111111',
  a1: 'a1111111-1111-4111-8111-111111111111',
  a2: 'a2222222-2222-4222-8222-222222222222',
  a3: 'a3333333-3333-4333-8333-333333333333',
  img: 'c1111111-1111-4111-8111-111111111111',
  work1: 'd1111111-1111-4111-8111-111111111111',
  artwork1: 'e1111111-1111-4111-8111-111111111111',
}

export function makeExhibition(over: Partial<AdminExhibition> = {}): AdminExhibition {
  return {
    id: ID.ex,
    slug: 'tidewater',
    title: 'Tidewater',
    subtitle: 'New painting from the southern coast',
    city: 'Chennai',
    country: 'India',
    type: 'GROUP',
    startDate: '2026-10-03T00:00:00.000Z',
    endDate: '2026-11-22T00:00:00.000Z',
    datesLabel: 'October 3 – November 22, 2026',
    statusOverride: null,
    venue: 'Art Houz Chennai',
    blurb: 'Recent canvases.',
    body: '',
    heroImageId: null,
    isPublished: true,
    sortOrder: 0,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-30T10:42:00.000Z',
    status: 'CURRENT',
    statusLabel: 'Now on view',
    artistLine: 'Parvathi Nayar, Ranjith Raman',
    heroImage: null,
    artists: [
      { artistId: ID.a1, sortOrder: 0, artist: { id: ID.a1, name: 'Parvathi Nayar', slug: 'parvathi-nayar' } },
      { artistId: ID.a2, sortOrder: 1, artist: { id: ID.a2, name: 'Ranjith Raman', slug: 'ranjith-raman' } },
      { artistId: ID.a3, sortOrder: 2, artist: { id: ID.a3, name: 'P. Gopinath', slug: 'p-gopinath' } },
    ],
    ...over,
  }
}

export function makeWork(over: Partial<ExhibitionWork> = {}): ExhibitionWork {
  return {
    id: ID.work1,
    title: 'Ledger of Rivers',
    year: '2026',
    medium: 'Acrylic on canvas',
    sortOrder: 0,
    artistId: ID.a1,
    artist: { id: ID.a1, name: 'Parvathi Nayar' },
    image: { id: ID.img, url: 'https://cdn.example/w.jpg', thumbUrl: 'https://cdn.example/w-t.jpg' },
    artworkId: null,
    ...over,
  }
}

/** Handlers every editor render needs besides the exhibition itself. */
export function useEditorHandlers(exhibition: AdminExhibition, works: ExhibitionWork[] = []) {
  server.use(
    http.get(`${API_URL}/exhibitions/${exhibition.id}`, () => HttpResponse.json(envelope(exhibition))),
    http.get(`${API_URL}/exhibitions/${exhibition.id}/works`, () => HttpResponse.json(envelope(works))),
    http.get(`${API_URL}/news`, () => HttpResponse.json(envelope([]))),
  )
}

export function renderWithProviders(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>{ui}</ToastProvider>
    </QueryClientProvider>,
  )
}

export function renderRoutes(initial: string, routes: Array<{ path: string; element: ReactElement }>) {
  const router = createMemoryRouter(routes, { initialEntries: [initial] })
  const result = renderWithProviders(<RouterProvider router={router} />)
  return { router, ...result }
}
