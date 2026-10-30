import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import type { ReactElement } from 'react'
import { ToastProvider } from '../../lib/toast'
import { API_URL, HttpResponse, envelope, http, server } from '../../test/msw'

export type Role = 'ADMIN' | 'EDITOR'

export function signIn(role: Role = 'ADMIN') {
  server.use(
    http.get(`${API_URL}/auth/me`, () =>
      HttpResponse.json(envelope({ id: 'u-me', email: 'priya@arthouz.com', name: 'Priya Raman', role })),
    ),
  )
}

export function renderPage(ui: ReactElement, initialEntry = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialEntry]}>{ui}</MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}
