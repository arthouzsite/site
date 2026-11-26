import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { API_URL, HttpResponse, envelope, errorEnvelope, http, server } from '../../test/msw'
import { renderRoutes } from '../../test/renderRoutes'
import EnquiriesPage from './EnquiriesPage'
import { makeEnquiry, serviceEnquiry } from './testData'

const routes = [{ path: '/enquiries', element: <EnquiriesPage /> }]
const rows = [makeEnquiry(), serviceEnquiry()]
const page = (items: unknown[], total = items.length) => HttpResponse.json({ ...envelope(items), meta: { total, page: 1, limit: 25 } })

describe('EnquiriesPage', () => {
  it('lists enquiries with received date, type, subject, name, mobile, email and handled toggle', async () => {
    server.use(http.get(`${API_URL}/enquiries`, () => page(rows)))
    renderRoutes(routes, '/enquiries')
    expect(await screen.findByRole('heading', { level: 1, name: 'Enquiries' })).toBeInTheDocument()
    const table = await screen.findByRole('table', { name: /Enquiries, newest first, 2 records/ })
    const headers = within(table).getAllByRole('columnheader').map((h) => h.textContent)
    expect(headers).toEqual(['Received', 'Type', 'Image', 'Subject', 'Name', 'Mobile', 'Email', 'Handled', 'Actions'])
    const first = within(table).getAllByRole('row')[1]!
    expect(within(first).getByText('Artist')).toBeInTheDocument()
    expect(within(first).getByText('Vijay Pichumani')).toBeInTheDocument()
    expect(within(first).getByText('Asha Rao')).toBeInTheDocument()
    expect(within(first).getByText('+919876543210')).toBeInTheDocument()
    expect(within(first).getByText('asha@example.com')).toBeInTheDocument()
    expect(within(first).getByText(/16 Nov 2026/)).toBeInTheDocument()
    expect(within(first).getByRole('switch', { name: /Handled: Asha Rao/ })).not.toBeChecked()
  })

  it('shows an empty state', async () => {
    server.use(http.get(`${API_URL}/enquiries`, () => page([])))
    renderRoutes(routes, '/enquiries')
    expect(await screen.findByText('No enquiries yet.')).toBeInTheDocument()
  })

  it('shows a load error', async () => {
    server.use(http.get(`${API_URL}/enquiries`, () => HttpResponse.json(errorEnvelope('INTERNAL', 'x'), { status: 500 })))
    renderRoutes(routes, '/enquiries')
    expect(await screen.findByText('Could not load enquiries. Try again.')).toBeInTheDocument()
  })

  it('requests the chosen type and keeps it in the URL', async () => {
    const kinds: Array<string | null> = []
    server.use(http.get(`${API_URL}/enquiries`, ({ request }) => {
      kinds.push(new URL(request.url).searchParams.get('kind'))
      return page(rows)
    }))
    const { router } = renderRoutes(routes, '/enquiries')
    await screen.findByRole('table')
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'SERVICE')
    await waitFor(() => expect(kinds).toContain('SERVICE'))
    expect(router.state.location.search).toBe('?kind=SERVICE')
  })

  it('pages through the list', async () => {
    const pages: string[] = []
    server.use(http.get(`${API_URL}/enquiries`, ({ request }) => {
      pages.push(new URL(request.url).searchParams.get('page') ?? '')
      return page(rows, 60)
    }))
    renderRoutes(routes, '/enquiries')
    await userEvent.click(await screen.findByRole('button', { name: 'Page 2' }))
    await waitFor(() => expect(pages).toContain('2'))
  })

  it('toggles handled with a PATCH', async () => {
    let body: unknown
    server.use(
      http.get(`${API_URL}/enquiries`, () => page(rows)),
      http.patch(`${API_URL}/enquiries/e1`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(envelope({ ...rows[0], isHandled: true }))
      }),
    )
    renderRoutes(routes, '/enquiries')
    await userEvent.click(await screen.findByRole('switch', { name: /Handled: Asha Rao/ }))
    await waitFor(() => expect(body).toEqual({ isHandled: true }))
  })

  it('opens a row to show the whole enquiry, including dates, purpose, location and message', async () => {
    server.use(http.get(`${API_URL}/enquiries`, () => page([serviceEnquiry({ message: 'Need lights.' })])))
    renderRoutes(routes, '/enquiries')
    await userEvent.click(await screen.findByRole('button', { name: 'Photo shoots' }))
    const dialog = await screen.findByRole('dialog', { name: 'Enquiry from Ravi Kumar' })
    for (const text of ['Photography', 'Chennai', 'Need lights.', '1 Dec 2026 to 5 Dec 2026', 'ravi@example.com', '+914412345678']) {
      expect(within(dialog).getByText(text)).toBeInTheDocument()
    }
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('labels a print order as Print, offers Print enquiries in the filter and shows no message row for it', async () => {
    server.use(http.get(`${API_URL}/enquiries`, () => page([makeEnquiry({ kind: 'PRINT', subject: 'Golden Sunset Fields: work', message: '' })])))
    renderRoutes(routes, '/enquiries')
    const table = await screen.findByRole('table')
    expect(within(within(table).getAllByRole('row')[1]!).getByText('Print')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Print enquiries' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Golden Sunset Fields: work' }))
    const dialog = await screen.findByRole('dialog', { name: 'Enquiry from Asha Rao' })
    expect(within(dialog).getByText('Subject')).toBeInTheDocument()
    expect(within(dialog).getByText('Print')).toBeInTheDocument()
    expect(within(dialog).queryByText('Message')).not.toBeInTheDocument()
  })

  it('shows the picture of the print or work an enquiry is about in the list', async () => {
    server.use(http.get(`${API_URL}/enquiries`, () => page([makeEnquiry({ subject: 'Vijay Pichumani: Red Earth', imageUrl: 'https://cdn.test/red-earth-t.jpg' }), serviceEnquiry()])))
    renderRoutes(routes, '/enquiries')
    const table = await screen.findByRole('table')
    const [, withImage, without] = within(table).getAllByRole('row')
    expect(withImage!.querySelector('img')).toHaveAttribute('src', 'https://cdn.test/red-earth-t.jpg')
    expect(without!.querySelector('img')).toBeNull()
  })

  it('marks a subject whose service or artist was deleted', async () => {
    server.use(http.get(`${API_URL}/enquiries`, () => page([makeEnquiry({ subjectRemoved: true })])))
    renderRoutes(routes, '/enquiries')
    expect(await screen.findByText('(deleted)')).toBeInTheDocument()
  })

  it('deletes only after the confirm modal, never with a native dialog', async () => {
    const confirm = vi.spyOn(window, 'confirm')
    let deleted = 0
    server.use(
      http.get(`${API_URL}/enquiries`, () => page(rows)),
      http.delete(`${API_URL}/enquiries/e1`, () => {
        deleted += 1
        return HttpResponse.json(envelope({ id: 'e1' }))
      }),
    )
    renderRoutes(routes, '/enquiries')
    await userEvent.click(await screen.findByRole('button', { name: 'Delete enquiry from Asha Rao' }))
    const modal = screen.getByRole('alertdialog', { name: 'Delete enquiry' })
    expect(deleted).toBe(0)
    await userEvent.click(within(modal).getByRole('button', { name: 'Cancel' }))
    expect(deleted).toBe(0)

    await userEvent.click(screen.getByRole('button', { name: 'Delete enquiry from Asha Rao' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete enquiry' }))
    await waitFor(() => expect(deleted).toBe(1))
    expect(await screen.findByText('Enquiry deleted')).toBeInTheDocument()
    expect(confirm).not.toHaveBeenCalled()
  })
})
