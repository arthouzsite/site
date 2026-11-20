import { render, screen, waitFor } from '@testing-library/react'
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
  await screen.findByRole('img', { name: 'Security code' })
  await user.type(screen.getByLabelText('Security code'), 'ab2f6')
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

  it('sends the challenge token with the typed code', async () => {
    let sent: unknown
    server.use(
      http.post(`${API_URL}/auth/login`, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json(envelope({ id: '1', email: 'priya@arthouz.com', name: 'Priya', role: 'EDITOR' }))
      }),
    )
    setup()
    await fill('priya@arthouz.com', 'secret')
    expect(await screen.findByText('Home page')).toBeInTheDocument()
    expect(sent).toEqual({ email: 'priya@arthouz.com', password: 'secret', captchaAnswer: 'ab2f6', captchaToken: 'captcha-token' })
  })

  it('shows a wrong code against its field once, clears it and draws a new challenge', async () => {
    let challenges = 0
    const message = 'The security code does not match. Try the new one.'
    server.use(
      http.get(`${API_URL}/auth/captcha`, () => {
        challenges += 1
        return HttpResponse.json(envelope({ token: `token-${challenges}`, image: '<svg xmlns="http://www.w3.org/2000/svg"/>' }))
      }),
      http.post(`${API_URL}/auth/login`, () =>
        HttpResponse.json(errorEnvelope('CAPTCHA_INVALID', message, { captchaAnswer: message }), { status: 400 }),
      ),
    )
    setup()
    await fill('priya@arthouz.com', 'secret')
    expect(await screen.findByRole('link', { name: message })).toHaveAttribute('href', '#field-captchaAnswer')
    expect(screen.getAllByRole('link', { name: message })).toHaveLength(1)
    await waitFor(() => expect(challenges).toBe(2))
    expect(screen.getByLabelText('Security code')).toHaveValue('')
  })

  it('draws a different code on request and asks for the code when it is left empty', async () => {
    let challenges = 0
    server.use(
      http.get(`${API_URL}/auth/captcha`, () => {
        challenges += 1
        return HttpResponse.json(envelope({ token: `token-${challenges}`, image: '<svg xmlns="http://www.w3.org/2000/svg"/>' }))
      }),
    )
    setup()
    const user = userEvent.setup()
    await screen.findByRole('img', { name: 'Security code' })
    await user.click(screen.getByRole('button', { name: 'Show a different code' }))
    await waitFor(() => expect(challenges).toBe(2))
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('link', { name: 'Enter the security code' })).toBeInTheDocument()
  })

  it('waits for the challenge when the form is submitted before it has loaded', async () => {
    let sent: { captchaToken?: string } = {}
    server.use(
      http.get(`${API_URL}/auth/captcha`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 150))
        return HttpResponse.json(envelope({ token: 'late-token', image: '<svg xmlns="http://www.w3.org/2000/svg"/>' }))
      }),
      http.post(`${API_URL}/auth/login`, async ({ request }) => {
        sent = (await request.json()) as { captchaToken?: string }
        return HttpResponse.json(envelope({ id: '1', email: 'priya@arthouz.com', name: 'Priya', role: 'EDITOR' }))
      }),
    )
    setup()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Email'), 'priya@arthouz.com')
    await user.type(screen.getByLabelText('Password'), 'secret')
    await user.type(screen.getByLabelText('Security code'), 'ab2f6')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Home page')).toBeInTheDocument()
    expect(sent.captchaToken).toBe('late-token')
  })

  it('says so when the challenge cannot load', async () => {
    server.use(http.get(`${API_URL}/auth/captcha`, () => HttpResponse.json(errorEnvelope('INTERNAL', 'x'), { status: 500 })))
    setup()
    expect(await screen.findByText('The security code could not load.')).toBeInTheDocument()
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
