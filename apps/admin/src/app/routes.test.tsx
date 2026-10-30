import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from './router'
import { ToastProvider } from '../lib/toast'
import { API_URL, HttpResponse, envelope, http, server } from '../test/msw'

const PAGES: Array<[string, string]> = [
  ['/', 'Dashboard'], ['/exhibitions', 'Exhibitions'], ['/exhibitions/new', 'New exhibition'], ['/exhibitions/abc', 'Exhibition'],
  ['/artists', 'Artists'], ['/artists/new', 'Artist'], ['/artists/abc', 'Artist'], ['/fairs', 'Fairs'], ['/fairs/abc', 'Fair'],
  ['/news', 'News'], ['/news/abc', 'News item'], ['/locations', 'Locations'], ['/about', 'About page'],
  ['/settings', 'Home & settings'], ['/media', 'Media'], ['/users', 'Users'],
]

describe('routes', () => {
  it.each(PAGES)('%s renders its page title', async (path, title) => {
    server.use(http.get(`${API_URL}/auth/me`, () => HttpResponse.json(envelope({ id: '1', email: 'a@x.com', name: 'Ada Admin', role: 'ADMIN' }))))
    const router = createMemoryRouter(routes, { initialEntries: [path] })
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ToastProvider><RouterProvider router={router} /></ToastProvider>
      </QueryClientProvider>,
    )
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument()
  })
})
