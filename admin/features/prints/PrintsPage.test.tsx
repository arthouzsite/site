import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PRINT_CATEGORIES_MAX } from '@/lib/shared'
import { API_URL, HttpResponse, envelope, http, server } from '../../test/msw'
import { renderRoutes } from '../../test/renderRoutes'
import PrintsPage from './PrintsPage'
import type { AdminPrintCategory } from './types'

const M1 = '11111111-1111-4111-8111-111111111111'
const M2 = '22222222-2222-4222-8222-222222222222'
const image = (id: string, label = id === M1 ? 'm1' : 'm2') => ({ id, url: `https://cdn.test/${id}.jpg`, thumbUrl: `https://cdn.test/${id}-t.jpg`, width: 800, height: 1000, alt: `Print ${label}` })
const category = (over: Partial<AdminPrintCategory> = {}): AdminPrintCategory => ({ id: 'p1', slug: 'etchings', name: 'Etchings', sortOrder: 0, images: [image(M1), image(M2)], ...over })
const categories = [category(), category({ id: 'p2', slug: 'linocuts', name: 'Linocuts', sortOrder: 1, images: [] })]
const mount = () => renderRoutes([{ path: '/prints', element: <PrintsPage /> }], '/prints')
const card = (name: string) => screen.getByRole('region', { name })
const list = (data: AdminPrintCategory[] = categories) => http.get(`${API_URL}/prints`, () => HttpResponse.json(envelope(data)))

describe('PrintsPage', () => {
  it('lists each category with its name and image count', async () => {
    server.use(list())
    mount()
    expect(await screen.findByRole('region', { name: 'Etchings' })).toBeInTheDocument()
    expect(within(card('Etchings')).getByLabelText(/Category name/)).toHaveValue('Etchings')
    expect(within(card('Etchings')).getByText('2 of 20')).toBeInTheDocument()
    expect(within(card('Etchings')).getByText('Print m1')).toBeInTheDocument()
    expect(within(card('Linocuts')).getByText('0 of 20')).toBeInTheDocument()
  })

  it('adds a category with the name focused, requires the name, and posts it', async () => {
    let body: unknown
    server.use(
      list([]),
      http.post(`${API_URL}/prints`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(envelope(category({ id: 'p9', slug: 'woodcuts', name: 'Woodcuts', images: [] })), { status: 201 })
      }),
    )
    mount()
    expect(await screen.findByText('No categories yet.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Add category' }))
    const fresh = card('New category')
    const name = within(fresh).getByLabelText(/Category name/)
    expect(name).toHaveFocus()
    await userEvent.click(within(fresh).getByRole('button', { name: 'Save' }))
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(body).toBeUndefined()
    await userEvent.type(name, 'Woodcuts')
    await userEvent.click(within(card('Woodcuts')).getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Saved · Woodcuts')).toBeInTheDocument()
    expect(body).toMatchObject({ name: 'Woodcuts', imageIds: [] })
  })

  it('saves the image order of one category', async () => {
    let body: Record<string, unknown> | undefined
    server.use(
      list(),
      http.patch(`${API_URL}/prints/p1`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(envelope(category({ images: [image(M2), image(M1)] })))
      }),
    )
    mount()
    await screen.findByRole('region', { name: 'Etchings' })
    await userEvent.click(within(card('Etchings')).getByRole('button', { name: /Move Print m2 up/ }))
    await userEvent.click(within(card('Etchings')).getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Saved · Etchings')).toBeInTheDocument()
    expect(body).toMatchObject({ name: 'Etchings', slug: 'etchings', imageIds: [M2, M1] })
  })

  it('reorders categories and deletes one through a confirm modal', async () => {
    let order: unknown
    let deleted = false
    server.use(
      list(),
      http.put(`${API_URL}/prints/order`, async ({ request }) => {
        order = await request.json()
        return HttpResponse.json(envelope(null))
      }),
      http.delete(`${API_URL}/prints/p2`, () => {
        deleted = true
        return HttpResponse.json(envelope({ id: 'p2' }))
      }),
    )
    mount()
    await screen.findByRole('region', { name: 'Etchings' })
    expect(within(card('Etchings')).getByRole('button', { name: 'Move Etchings up' })).toBeDisabled()
    await userEvent.click(within(card('Etchings')).getByRole('button', { name: 'Move Etchings down' }))
    expect(order).toEqual({ ids: ['p2', 'p1'] })
    await userEvent.click(within(card('Linocuts')).getByRole('button', { name: 'Delete' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete category' }))
    expect(await screen.findByText('Deleted · Linocuts')).toBeInTheDocument()
    expect(deleted).toBe(true)
  })

  it(`refuses a category past the limit of ${PRINT_CATEGORIES_MAX}`, async () => {
    const full = Array.from({ length: PRINT_CATEGORIES_MAX }, (_, i) => category({ id: `p${i}`, slug: `c${i}`, name: `Category ${i}`, sortOrder: i, images: [] }))
    server.use(list(full))
    mount()
    await screen.findByRole('region', { name: 'Category 0' })
    await userEvent.click(screen.getByRole('button', { name: 'Add category' }))
    expect(await screen.findByText(`Prints holds at most ${PRINT_CATEGORIES_MAX} categories`)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'New category' })).not.toBeInTheDocument()
  })
})
