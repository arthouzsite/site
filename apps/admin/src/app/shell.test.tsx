import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from './router'
import { delay } from 'msw'
import { API_URL, HttpResponse, envelope, errorEnvelope, http, server } from '../test/msw'

const editor = { id: '1', email: 'p@x.com', name: 'Priya Raman', role: 'EDITOR' }

function mount(path: string, user: typeof editor | null) {
  server.use(
    http.get(`${API_URL}/auth/me`, () =>
      user ? HttpResponse.json(envelope(user)) : HttpResponse.json(errorEnvelope('UNAUTHENTICATED', 'No'), { status: 401 }),
    ),
    http.post(`${API_URL}/auth/logout`, () => HttpResponse.json(envelope(null))),
  )
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

describe('shell and guards', () => {
  it('redirects unauthenticated visitors to /login with next', async () => {
    const router = mount('/artists?x=1', null)
    expect(await screen.findByRole('heading', { name: 'Sign in' }, { timeout: 4000 })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(router.state.location.search).toBe('?next=%2Fartists%3Fx%3D1')
  })

  it('shows a quiet loading state while the session is pending', async () => {
    mount('/', editor)
    server.use(http.get(`${API_URL}/auth/me`, async () => { await delay('infinite') }))
    expect(await screen.findByRole('status')).toHaveTextContent('Loading')
  })

  it('renders the shell with the active link, breadcrumb and initials', async () => {
    mount('/exhibitions', editor)
    expect(await screen.findByRole('heading', { name: 'Exhibitions' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Exhibitions' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('CMS/Exhibitions')
    expect(screen.getByText('PR')).toBeInTheDocument()
    expect(screen.getByText(/Signed in as Priya Raman/)).toBeInTheDocument()
  })

  it('hides Users from editors and sends them home from /users', async () => {
    const router = mount('/users', editor)
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument()
  })

  it('lets admins open /users', async () => {
    mount('/users', { ...editor, role: 'ADMIN' })
    expect(await screen.findByRole('heading', { name: 'Users' })).toBeInTheDocument()
  })

  it('returns to /login after signing out', async () => {
    const router = mount('/', editor)
    await userEvent.click(await screen.findByRole('button', { name: /sign out/ }))
    expect(await screen.findByRole('heading', { name: 'Sign in' }, { timeout: 4000 })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('redirects to login when a call reports an expired session', async () => {
    const router = mount('/media', editor)
    await screen.findByRole('heading', { name: 'Media' })
    server.use(http.get(`${API_URL}/exhibitions`, () => HttpResponse.json(errorEnvelope('UNAUTHENTICATED', 'No'), { status: 401 })))
    const { api } = await import('../lib/api')
    await api.get('/exhibitions').catch(() => undefined)
    expect(await screen.findByRole('heading', { name: 'Sign in' }, { timeout: 4000 })).toBeInTheDocument()
    expect(router.state.location.search).toBe('?next=%2Fmedia')
  })
})
