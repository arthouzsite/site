import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from '../../lib/api'
import { UploadQueue } from './UploadQueue'
import { makeMedia, renderWithProviders } from './testUtils'

const file = (name = 'hero.jpg') => new File(['x'], name, { type: 'image/jpeg' })

async function choose(files: File[]) {
  const user = userEvent.setup()
  await user.upload(screen.getByLabelText(/choose files/i), files)
  return user
}

afterEach(() => vi.restoreAllMocks())

describe('UploadQueue', () => {
  it('upload button disabled until alt text entered', async () => {
    const upload = vi.spyOn(api, 'upload').mockResolvedValue(makeMedia())
    renderWithProviders(<UploadQueue />)
    const user = await choose([file()])
    const button = screen.getByRole('button', { name: /^upload 1 file/i })
    expect(button).toBeDisabled()
    await user.type(screen.getByLabelText('Alt text for hero.jpg'), 'A hero image')
    expect(button).toBeEnabled()
    await user.click(button)
    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1))
    const form = upload.mock.calls[0]![1] as FormData
    expect(form.get('alt')).toBe('A hero image')
    expect((form.get('file') as File).name).toBe('hero.jpg')
  })

  it('progress updates from onProgress', async () => {
    vi.spyOn(api, 'upload').mockImplementation((_p, _f, onProgress) => {
      onProgress?.(0.4)
      return new Promise(() => {})
    })
    renderWithProviders(<UploadQueue />)
    const user = await choose([file()])
    await user.type(screen.getByLabelText('Alt text for hero.jpg'), 'Alt')
    await user.click(screen.getByRole('button', { name: /^upload 1 file/i }))
    const bar = await screen.findByRole('progressbar', { name: /uploading hero\.jpg/i })
    expect(bar).toHaveAttribute('aria-valuenow', '40')
  })

  it.each([
    ['INVALID_IMAGE', 400, 'could not be read'],
    ['PAYLOAD_TOO_LARGE', 413, '25 MB'],
    ['UNSUPPORTED_MEDIA_TYPE', 415, 'JPEG, PNG, WebP or AVIF'],
    ['VALIDATION', 400, 'Alt text is required'],
  ])('maps %s to plain English inline', async (code, status, text) => {
    vi.spyOn(api, 'upload').mockRejectedValue(new ApiError(status, { code, message: 'raw', fields: { alt: 'x' } }))
    renderWithProviders(<UploadQueue />)
    const user = await choose([file()])
    await user.type(screen.getByLabelText('Alt text for hero.jpg'), 'Alt')
    await user.click(screen.getByRole('button', { name: /^upload 1 file/i }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(new RegExp(text))
    const item = alert.closest('li')!
    expect(within(item).getByText('hero.jpg')).toBeInTheDocument()
  })

  it('removes a queued file and reports uploaded media', async () => {
    const media = makeMedia({ id: 'new' })
    vi.spyOn(api, 'upload').mockResolvedValue(media)
    const onUploaded = vi.fn()
    renderWithProviders(<UploadQueue onUploaded={onUploaded} />)
    const user = await choose([file('a.jpg'), file('b.jpg')])
    await user.click(screen.getByRole('button', { name: 'Remove b.jpg' }))
    await user.type(screen.getByLabelText('Alt text for a.jpg'), 'Alt')
    await user.click(screen.getByRole('button', { name: /^upload 1 file/i }))
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith(media))
    expect(screen.queryByText('a.jpg')).not.toBeInTheDocument()
  })
})
