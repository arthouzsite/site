import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { API_URL, HttpResponse, envelope, errorEnvelope, http, server } from '../../test/msw'
import { MediaDetailPanel } from './MediaDetailPanel'
import { makeMedia, renderWithProviders } from './testUtils'

const usedBy = [{ type: 'exhibition', id: 'e1', title: 'Tidewater' }]

function detail(used = usedBy) {
  server.use(http.get(`${API_URL}/media/m1`, () => HttpResponse.json(envelope({ ...makeMedia(), usedBy: used }))))
}

describe('MediaDetailPanel', () => {
  it('delete in-use media shows usage list, not an error toast', async () => {
    detail()
    server.use(
      http.delete(`${API_URL}/media/m1`, () =>
        HttpResponse.json(
          { ...errorEnvelope('MEDIA_IN_USE', 'in use'), error: { code: 'MEDIA_IN_USE', message: 'in use', details: { usedBy } } },
          { status: 409 },
        ),
      ),
    )
    renderWithProviders(<MediaDetailPanel id="m1" onClose={() => {}} onSelect={() => {}} />)
    const user = userEvent.setup()
    await screen.findByDisplayValue('Tidewater hero')
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Delete image' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'This image is in use' })
    expect(dialog).toHaveTextContent('Tidewater')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('requires alt text and saves alt and caption', async () => {
    detail([])
    let body: unknown
    server.use(
      http.patch(`${API_URL}/media/m1`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(envelope(makeMedia({ alt: 'New alt', caption: 'Cap' })))
      }),
    )
    renderWithProviders(<MediaDetailPanel id="m1" onClose={() => {}} onSelect={() => {}} />)
    const user = userEvent.setup()
    const alt = await screen.findByLabelText(/alt text/i)
    await user.clear(alt)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Enter alt text')).toBeInTheDocument()
    await user.type(alt, 'New alt')
    await user.type(screen.getByLabelText('Caption'), 'Cap')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Saved')).toBeInTheDocument()
    expect(body).toEqual({ alt: 'New alt', caption: 'Cap' })
  })

  it('deletes unused media and copies the URL', async () => {
    detail([])
    const onClose = vi.fn()
    server.use(http.delete(`${API_URL}/media/m1`, () => new HttpResponse(null, { status: 204 })))
    renderWithProviders(<MediaDetailPanel id="m1" onClose={onClose} onSelect={() => {}} />)
    const user = userEvent.setup()
    await screen.findByDisplayValue('Tidewater hero')
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    await user.click(screen.getByRole('button', { name: 'Copy URL' }))
    expect(writeText).toHaveBeenCalledWith('https://cdn.example/m1.jpg')
    expect(await screen.findByText('URL copied')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Delete image' }))
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
  })
})
