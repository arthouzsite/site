import { render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { routes } from '../../app/router'
import { ToastProvider } from '../../lib/toast'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { API_URL, HttpResponse, envelope, errorEnvelope, http, server } from '../../test/msw'
import { renderPage, signIn } from '../settings/testUtils'
import UsersPage from './UsersPage'
import { formatLastSignIn } from './userFormat'
import { generatePassword } from './password'

const users = [
  { id: 'u-me', email: 'priya@arthouz.com', name: 'Priya Raman', role: 'ADMIN', isDisabled: false, lastLoginAt: new Date().toISOString(), createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'u2', email: 'arun@arthouz.com', name: 'Arun Kumar', role: 'EDITOR', isDisabled: false, lastLoginAt: null, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'u3', email: 'old@arthouz.com', name: 'Old Hand', role: 'EDITOR', isDisabled: true, lastLoginAt: '2026-02-03T10:00:00.000Z', createdAt: '2026-01-01T00:00:00.000Z' },
]

function setup(opts: { deleteFails?: boolean } = {}) {
  signIn('ADMIN')
  const calls: Array<{ method: string; url: string; body?: unknown }> = []
  server.use(
    http.get(`${API_URL}/users`, () => HttpResponse.json(envelope(users))),
    http.post(`${API_URL}/users`, async ({ request }) => {
      const body = await request.json()
      calls.push({ method: 'POST', url: '/users', body })
      return HttpResponse.json(envelope({ ...users[1], id: 'new' }), { status: 201 })
    }),
    http.patch(`${API_URL}/users/:id`, async ({ params, request }) => {
      calls.push({ method: 'PATCH', url: `/users/${String(params.id)}`, body: await request.json() })
      return HttpResponse.json(envelope(users[1]))
    }),
    http.delete(`${API_URL}/users/:id`, ({ params }) => {
      if (opts.deleteFails) return HttpResponse.json(errorEnvelope('CANNOT_DELETE_SELF', 'no'), { status: 400 })
      calls.push({ method: 'DELETE', url: `/users/${String(params.id)}` })
      return HttpResponse.json(envelope(null))
    }),
  )
  renderPage(<UsersPage />)
  return calls
}

const row = (name: string) => screen.getByRole('row', { name: new RegExp(name) })

describe('UsersPage', () => {
  it('lists users with You marker, role, status and the active count', async () => {
    setup()
    await screen.findByText('Arun Kumar')
    expect(screen.getByText('2 people can sign in')).toBeInTheDocument()
    expect(within(row('Priya Raman')).getByText('You')).toBeInTheDocument()
    expect(within(row('Priya Raman')).getByText('Active')).toBeInTheDocument()
    expect(within(row('Priya Raman')).getByText(/^Today, \d{1,2}:\d{2} [ap]m$/)).toBeInTheDocument()
    expect(within(row('Arun Kumar')).getByText('Invited')).toBeInTheDocument()
    expect(within(row('Arun Kumar')).getByText('Never')).toBeInTheDocument()
    expect(within(row('Old Hand')).getByText('Disabled')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete Priya Raman' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete Arun Kumar' })).toBeInTheDocument()
  })

  it('validates, generates a password, invites and shows the password once', async () => {
    const calls = setup()
    const user = userEvent.setup()
    await screen.findByText('Arun Kumar')
    await user.click(screen.getByRole('button', { name: 'Send invite' }))
    expect(await screen.findAllByText('Enter a name')).not.toHaveLength(0)
    expect(calls).toEqual([])

    await user.type(screen.getByLabelText(/^Name/), 'Meera Nair')
    await user.type(screen.getByLabelText(/^Email/), 'Meera@Arthouz.com')
    await user.selectOptions(screen.getByLabelText('Role'), 'ADMIN')
    await user.click(screen.getByRole('button', { name: 'Generate' }))
    const password = (screen.getByLabelText(/^Temporary password/) as HTMLInputElement).value
    expect(password).toHaveLength(16)
    await user.click(screen.getByRole('button', { name: 'Send invite' }))

    await waitFor(() => expect(calls).toEqual([{ method: 'POST', url: '/users', body: { name: 'Meera Nair', email: 'meera@arthouz.com', role: 'ADMIN', password } }]))
    const dialog = await screen.findByRole('dialog', { name: 'Invite created' })
    expect(within(dialog).getByText(password)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Done' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/^Name/)).toHaveValue('')
  })

  it('edits a user and PATCHes only the changed fields', async () => {
    const calls = setup()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Edit Arun Kumar' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit Arun Kumar' })
    const name = within(dialog).getByLabelText(/^Name/)
    await user.clear(name)
    await user.type(name, 'Arun K')
    await user.type(within(dialog).getByLabelText('Reset password'), 'short')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(await within(dialog).findAllByText('Use at least 10 characters')).not.toHaveLength(0)
    await user.clear(within(dialog).getByLabelText('Reset password'))
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(calls).toEqual([{ method: 'PATCH', url: '/users/u2', body: { name: 'Arun K' } }]))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('asks for confirmation before disabling and offers no disable switch for yourself', async () => {
    const calls = setup()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Edit Arun Kumar' }))
    await user.click(screen.getByRole('switch', { name: 'Disabled' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    const confirm = await screen.findByRole('alertdialog', { name: 'Disable Arun Kumar?' })
    await user.click(within(confirm).getByRole('button', { name: 'Cancel' }))
    expect(calls).toEqual([])
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Disable' }))
    await waitFor(() => expect(calls).toEqual([{ method: 'PATCH', url: '/users/u2', body: { isDisabled: true } }]))
    await user.click(await screen.findByRole('button', { name: 'Edit Priya Raman' }))
    expect(screen.queryByRole('switch', { name: 'Disabled' })).not.toBeInTheDocument()
  })

  it('deletes after confirmation', async () => {
    const calls = setup()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Delete Old Hand' }))
    await user.click(within(screen.getByRole('alertdialog', { name: 'Delete Old Hand?' })).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(calls).toEqual([{ method: 'DELETE', url: '/users/u3' }]))
    expect(await screen.findByText('User deleted')).toBeInTheDocument()
  })

  it('maps CANNOT_DELETE_SELF to a toast', async () => {
    setup({ deleteFails: true })
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Delete Old Hand' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }))
    expect(await screen.findByText('You cannot delete your own account.')).toBeInTheDocument()
  })
})

describe('user helpers', () => {
  it('formats last sign-in', () => {
    const now = new Date('2026-10-30T09:00:00Z')
    expect(formatLastSignIn(null, now)).toBe('Never')
    expect(formatLastSignIn('2026-10-30T08:40:00Z', now)).toBe('Today, 2:10 pm')
    expect(formatLastSignIn('2026-02-03T10:00:00Z', now)).toBe('3 Feb 2026')
  })
  it('generates distinct 16 character passwords', () => {
    expect(generatePassword()).toHaveLength(16)
    expect(generatePassword()).not.toBe(generatePassword())
  })
})

describe('role gating', () => {
  it('users page and settings save hidden for EDITOR (users route sends editors home)', async () => {
    signIn('EDITOR')
    const empty = (path: string, data: unknown = []) => http.get(`${API_URL}${path}`, () => HttpResponse.json(envelope(data)))
    server.use(
      empty('/exhibitions'), empty('/artists'), empty('/news'), empty('/media'), empty('/settings', {}),
      empty('/public/home', { hero: null, heroLayout: 'FULL_BLEED', upcoming: null, focus: { artist: null }, artistsLine: [] }),
    )
    const router = createMemoryRouter(routes, { initialEntries: ['/users'] })
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ToastProvider><RouterProvider router={router} /></ToastProvider>
      </QueryClientProvider>,
    )
    expect(await screen.findByRole('heading', { level: 1, name: /^Good (morning|afternoon|evening)/ })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Users' })).not.toBeInTheDocument()
  })
})
