import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '../lib/toast'
import { routes } from './router'
import { API_URL, HttpResponse, envelope, http, server } from '../test/msw'

const PAGES: Array<[string, string]> = [
  ['/', 'Dashboard'], ['/exhibitions', 'Exhibitions'], ['/exhibitions/new', 'Exhibition'], ['/exhibitions/abc', 'Exhibition'],
  ['/artists', 'Artists'], ['/artists/new', 'Artist'], ['/artists/abc', 'Artist'], ['/fairs', 'Fairs'], ['/fairs/new', 'New fair'],
  ['/news', 'News'], ['/news/new', 'New news item'], ['/locations', 'Locations'], ['/about', 'About page'],
  ['/settings', 'Home & settings'], ['/media', 'Media'], ['/users', 'Users'],
]

describe('routes', () => {
  it.each(PAGES)('%s renders its page title', async (path, title) => {
    server.use(
      http.get(`${API_URL}/fairs`, () => HttpResponse.json(envelope([]))),
      http.get(`${API_URL}/news`, () => HttpResponse.json(envelope([]))),
      http.get(`${API_URL}/locations`, () => HttpResponse.json(envelope([]))),
      http.get(`${API_URL}/auth/me`, () => HttpResponse.json(envelope({ id: '1', email: 'a@x.com', name: 'Ada Admin', role: 'ADMIN' }))),
    )
    const router = createMemoryRouter(routes, { initialEntries: [path] })
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ToastProvider><RouterProvider router={router} /></ToastProvider>
      </QueryClientProvider>,
    )
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument()
  })
})
