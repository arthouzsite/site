import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import LoginPage from './LoginPage'
import { API_URL, HttpResponse, envelope, errorEnvelope, http, server } from '../../test/msw'

function setup(initial = '/login') {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '/', element: <p>Home page</p> },
      { path: '/artists', element: <p>Artists page</p> },
    ],
    { initialEntries: [initial] },
  )
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

async function fill(email: string, password: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Email'), email)
  if (password) await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
  return user
}

describe('LoginPage', () => {
  it('shows error summary on invalid email and server 401 message', async () => {
    setup()
    await fill('priya@arthouz', 'secret')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('There is a problem')
    expect(screen.getByRole('link', { name: 'Enter a valid email address' })).toHaveAttribute('href', '#field-email')
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')

    server.use(
      http.post(`${API_URL}/auth/login`, () =>
        HttpResponse.json(errorEnvelope('INVALID_CREDENTIALS', 'Invalid'), { status: 401 }),
      ),
    )
    const user = userEvent.setup()
    await user.clear(screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'priya@arthouz.com')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Email or password is incorrect')).toBeInTheDocument()
  })

  it('shows "Too many attempts" on 429', async () => {
    server.use(
      http.post(`${API_URL}/auth/login`, () =>
        HttpResponse.json(errorEnvelope('RATE_LIMITED', 'slow'), { status: 429 }),
      ),
    )
    setup()
    await fill('priya@arthouz.com', 'secret')
    expect(await screen.findByText('Too many attempts. Try again in a minute.')).toBeInTheDocument()
  })

  it('navigates to ?next after a successful sign in', async () => {
    server.use(
      http.post(`${API_URL}/auth/login`, () =>
        HttpResponse.json(envelope({ id: '1', email: 'priya@arthouz.com', name: 'Priya', role: 'EDITOR' })),
      ),
    )
    setup('/login?next=%2Fartists')
    await fill('priya@arthouz.com', 'secret')
    expect(await screen.findByText('Artists page')).toBeInTheDocument()
  })

  it('toggles password visibility', async () => {
    setup()
    const user = userEvent.setup()
    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(input).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true')
  })
})
