import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from './router'
import { ToastProvider } from '../lib/toast'
import { delay } from 'msw'
import { ID, makeExhibition, useEditorHandlers } from '../features/exhibitions/testUtils'
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
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider><RouterProvider router={router} /></ToastProvider>
    </QueryClientProvider>,
  )
  Object.assign(router, { client })
  return router as typeof router & { client: QueryClient }
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

  it('names the edited record in the breadcrumb instead of its id', async () => {
    useEditorHandlers(makeExhibition())
    server.use(http.get(`${API_URL}/artists`, () => HttpResponse.json(envelope([]))))
    mount(`/exhibitions/${ID.ex}`, editor)
    const nav = await screen.findByRole('navigation', { name: 'Breadcrumb' })
    await waitFor(() => expect(nav).toHaveTextContent('CMS/Exhibitions/Tidewater'))
    expect(within(nav).getByRole('link', { name: 'Exhibitions' })).toHaveAttribute('href', '/exhibitions')
  })

  it('hides Users from editors and sends them home from /users', async () => {
    const router = mount('/users', editor)
    expect(await screen.findByRole('heading', { level: 1, name: /^Good (morning|afternoon|evening)/ })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument()
  })

  it('lets admins open /users', async () => {
    mount('/users', { ...editor, role: 'ADMIN' })
    expect(await screen.findByRole('heading', { name: 'Users' })).toBeInTheDocument()
  })

  it('returns to /login after signing out', async () => {
    const router = mount('/', editor)
    await userEvent.click(await screen.findByRole('button', { name: /account menu/ }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }))
    expect(await screen.findByRole('heading', { name: 'Sign in' }, { timeout: 4000 })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('drops every cached query on sign out so the next user starts clean', async () => {
    const router = mount('/', editor)
    router.client.setQueryData(['exhibitions', 'list'], { items: [{ title: 'Private draft' }] })
    await userEvent.click(await screen.findByRole('button', { name: /account menu/ }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }))
    await screen.findByRole('heading', { name: 'Sign in' }, { timeout: 4000 })
    expect(router.client.getQueryData(['exhibitions', 'list'])).toBeUndefined()
  })

  it('drops every cached query when the session expires', async () => {
    const router = mount('/media', editor)
    await screen.findByRole('heading', { name: 'Media' })
    router.client.setQueryData(['exhibitions', 'list'], { items: [{ title: 'Private draft' }] })
    server.use(http.get(`${API_URL}/exhibitions`, () => HttpResponse.json(errorEnvelope('UNAUTHENTICATED', 'No'), { status: 401 })))
    const { api } = await import('../lib/api')
    await api.get('/exhibitions').catch(() => undefined)
    await screen.findByRole('heading', { name: 'Sign in' }, { timeout: 4000 })
    expect(router.client.getQueryData(['exhibitions', 'list'])).toBeUndefined()
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
