import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'
import { ToastProvider } from '../../lib/toast'
import type { Media } from './types'

export function makeMedia(over: Partial<Media> = {}): Media {
  return {
    id: 'm1',
    key: 'media/m1.jpg',
    url: 'https://cdn.example/m1.jpg',
    thumbUrl: 'https://cdn.example/m1-thumb.jpg',
    width: 2400,
    height: 1600,
    mime: 'image/jpeg',
    bytes: 1_258_291,
    alt: 'Tidewater hero',
    caption: null,
    uploadedById: 'u1',
    createdAt: '2026-10-03T10:00:00.000Z',
    updatedAt: '2026-10-03T10:00:00.000Z',
    ...over,
  }
}

export function renderWithProviders(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>{ui}</ToastProvider>
    </QueryClientProvider>,
  )
}
