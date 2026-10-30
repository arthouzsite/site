import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { RouterProvider, createMemoryRouter, type RouteObject } from 'react-router'
import { ToastProvider } from '../../lib/toast'
import type { AdminArtist, Artwork } from './types'

export function makeArtist(over: Partial<AdminArtist> = {}): AdminArtist {
  return {
    id: 'a1',
    slug: 'alpha-artist',
    name: 'Alpha Artist',
    sortName: 'Alpha Artist',
    medium: 'Painting',
    base: 'Chennai',
    born: '1956',
    lede: 'A lede.',
    bio: 'A bio.',
    portraitImageId: null,
    isFeatured: false,
    featuredOrder: 0,
    isPublished: true,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-28T10:00:00.000Z',
    portraitImage: null,
    artworkCount: 2,
    indexLetter: 'A',
    ...over,
  }
}

export function makeArtwork(over: Partial<Artwork> = {}): Artwork {
  return {
    id: 'w1',
    artistId: 'a1',
    title: 'Red Earth',
    year: '2026',
    medium: 'Acrylic on canvas',
    size: '120 x 90 cm',
    imageId: null,
    sortOrder: 0,
    isPublished: true,
    image: null,
    ...over,
  }
}

export function renderRoutes(routes: RouteObject[], initial: string) {
  const router = createMemoryRouter(routes, { initialEntries: [initial] })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const result = render(
    <QueryClientProvider client={client}>
      <ToastProvider><RouterProvider router={router} /></ToastProvider>
    </QueryClientProvider>,
  )
  return { router, client, ...result }
}
