import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from '../../lib/api'
import { HttpResponse, http, server } from '../../test/msw'
import { UploadQueue } from './UploadQueue'
import { mockUploadFlow } from '../../test/uploadMocks'
import { makeMedia, renderWithProviders } from './testUtils'

const file = (name = 'hero.jpg') => new File(['x'], name, { type: 'image/jpeg' })
const video = (name = 'tour.mp4') => new File(['x'], name, { type: 'video/mp4' })

async function choose(files: File[]) {
  const user = userEvent.setup()
  await user.upload(screen.getByLabelText(/choose files/i), files)
  return user
}

afterEach(() => vi.restoreAllMocks())

describe('UploadQueue', () => {
  it('upload button disabled until alt text entered', async () => {
    const calls = mockUploadFlow()
    renderWithProviders(<UploadQueue />)
    const user = await choose([file()])
    const button = screen.getByRole('button', { name: /^upload 1 file/i })
    expect(button).toBeDisabled()
    await user.type(screen.getByLabelText('Alt text for hero.jpg'), 'A hero image')
    expect(button).toBeEnabled()
    await user.click(button)
    await waitFor(() => expect(calls.completed).toHaveLength(1))
    expect(calls.authorised).toEqual([{ filename: 'hero.jpg', mime: 'image/jpeg', bytes: 1, alt: 'A hero image' }])
    expect(calls.puts).toEqual([{ key: 'arthouz/2026/hero.jpg', contentType: 'image/jpeg', bytes: 1 }])
    expect(calls.completed).toEqual([{ key: 'arthouz/2026/hero.jpg', alt: 'A hero image' }])
  })

  it('progress updates from onProgress', async () => {
    mockUploadFlow()
    // The PUT owns the first 90% of the bar, so half the bytes sent reads as 45%.
    vi.spyOn(api, 'putRaw').mockImplementation((_url, _body, _headers, onProgress) => {
      onProgress?.(0.5)
      return new Promise(() => {})
    })
    renderWithProviders(<UploadQueue />)
    const user = await choose([file()])
    await user.type(screen.getByLabelText('Alt text for hero.jpg'), 'Alt')
    await user.click(screen.getByRole('button', { name: /^upload 1 file/i }))
    const bar = await screen.findByRole('progressbar', { name: /uploading hero\.jpg/i })
    expect(bar).toHaveAttribute('aria-valuenow', '45')
  })

  it.each([
    ['INVALID_IMAGE', 400, 'not a valid image'],
    ['PAYLOAD_TOO_LARGE', 413, 'This image is larger than 25 MB'],
    ['UNSUPPORTED_MEDIA_TYPE', 415, 'Only JPEG, PNG, WebP, AVIF, MP4, WebM or MOV files'],
    ['VALIDATION', 400, 'Alt text is required'],
    ['INVALID_VIDEO', 400, 'This file is not a valid video.'],
    ['TOO_MANY_UPLOADS', 429, 'Too many uploads at once'],
  ])('maps %s to plain English inline', async (code, status, text) => {
    mockUploadFlow({ complete: () => { throw new ApiError(status, { code, message: 'raw', fields: { alt: 'x' } }) } })
    renderWithProviders(<UploadQueue />)
    const user = await choose([file()])
    await user.type(screen.getByLabelText('Alt text for hero.jpg'), 'Alt')
    await user.click(screen.getByRole('button', { name: /^upload 1 file/i }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(new RegExp(text))
    const item = alert.closest('li')!
    expect(within(item).getByText('hero.jpg')).toBeInTheDocument()
  })

  it('shows the storage message when the browser blocks the PUT', async () => {
    mockUploadFlow({ targetUrl: (key) => `https://bucket.r2.example/${key}` })
    server.use(http.put('https://bucket.r2.example/*', () => HttpResponse.error()))
    renderWithProviders(<UploadQueue />)
    const user = await choose([file()])
    await user.type(screen.getByLabelText('Alt text for hero.jpg'), 'Alt')
    await user.click(screen.getByRole('button', { name: /^upload 1 file/i }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('The storage at https://bucket.r2.example refused the upload. Check the bucket CORS rule.')
    expect(within(alert.closest('li')!).getByText('hero.jpg')).toBeInTheDocument()
  })

  it('shows the storage status when the PUT is rejected', async () => {
    mockUploadFlow({ targetUrl: (key) => `https://bucket.r2.example/${key}` })
    server.use(http.put('https://bucket.r2.example/*', () => new HttpResponse(null, { status: 403 })))
    renderWithProviders(<UploadQueue />)
    const user = await choose([file()])
    await user.type(screen.getByLabelText('Alt text for hero.jpg'), 'Alt')
    await user.click(screen.getByRole('button', { name: /^upload 1 file/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Storage returned 403')
  })

  it('shows the server message for an expired or unknown upload', async () => {
    mockUploadFlow({ complete: () => { throw new ApiError(404, { code: 'UPLOAD_NOT_FOUND', message: 'The uploaded file was not found. Upload it again.' }) } })
    renderWithProviders(<UploadQueue />)
    const user = await choose([file()])
    await user.type(screen.getByLabelText('Alt text for hero.jpg'), 'Alt')
    await user.click(screen.getByRole('button', { name: /^upload 1 file/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('The uploaded file was not found. Upload it again.')
  })

  it('does not name video formats in a 415 when only images are accepted', async () => {
    mockUploadFlow({ authorise: () => { throw new ApiError(415, { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'raw' }) } })
    renderWithProviders(<UploadQueue accept="image/jpeg,image/png,image/webp,image/avif" />)
    const user = await choose([file()])
    await user.type(screen.getByLabelText('Alt text for hero.jpg'), 'Alt')
    await user.click(screen.getByRole('button', { name: /^upload 1 file/i }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Only JPEG, PNG, WebP or AVIF files are accepted.')
    expect(alert).not.toHaveTextContent(/MP4|WebM|MOV/)
  })

  it('maps a 413 without a JSON envelope', async () => {
    mockUploadFlow({ authorise: () => { throw new ApiError(413, { code: 'HTTP_ERROR', message: 'Request failed (413)' }) } })
    renderWithProviders(<UploadQueue />)
    const user = await choose([file()])
    await user.type(screen.getByLabelText('Alt text for hero.jpg'), 'Alt')
    await user.click(screen.getByRole('button', { name: /^upload 1 file/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('This image is larger than 25 MB.')
  })

  it('names the 200 MB video limit for a rejected video', async () => {
    mockUploadFlow({ authorise: () => { throw new ApiError(413, { code: 'PAYLOAD_TOO_LARGE', message: 'raw' }) } })
    renderWithProviders(<UploadQueue />)
    const user = await choose([video()])
    await user.type(screen.getByLabelText('Alt text for tour.mp4'), 'Alt')
    await user.click(screen.getByRole('button', { name: /^upload 1 file/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('This video is larger than 200 MB.')
  })

  it('accepts images and videos with a hint naming both limits', () => {
    renderWithProviders(<UploadQueue />)
    expect(screen.getByLabelText(/choose files/i)).toHaveAttribute(
      'accept',
      'image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime',
    )
    expect(screen.getByText('JPEG, PNG, WebP or AVIF up to 25 MB, or MP4, WebM or MOV up to 200 MB')).toBeInTheDocument()
  })

  it('lets the caller narrow accept and hint', () => {
    renderWithProviders(<UploadQueue accept="image/jpeg" hint="JPEG only" />)
    expect(screen.getByLabelText(/choose files/i)).toHaveAttribute('accept', 'image/jpeg')
    expect(screen.getByText('JPEG only')).toBeInTheDocument()
  })

  it('uploads queued files one at a time, in order, and keeps going after a failure', async () => {
    const started: string[] = []
    let inFlight = 0
    let maxInFlight = 0
    mockUploadFlow({ complete: async ({ filename: name }) => {
      started.push(name)
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 5))
      inFlight -= 1
      if (name === 'b.jpg') throw new ApiError(400, { code: 'INVALID_IMAGE', message: 'raw' })
      return makeMedia({ id: name })
    } })
    const onUploaded = vi.fn()
    renderWithProviders(<UploadQueue onUploaded={onUploaded} />)
    const user = await choose([file('a.jpg'), file('b.jpg'), file('c.jpg')])
    for (const name of ['a.jpg', 'b.jpg', 'c.jpg']) await user.type(screen.getByLabelText(`Alt text for ${name}`), 'Alt')
    await user.click(screen.getByRole('button', { name: /^upload 3 files/i }))
    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(2))
    expect(started).toEqual(['a.jpg', 'b.jpg', 'c.jpg'])
    expect(maxInFlight).toBe(1)
    expect(await screen.findByRole('alert')).toHaveTextContent('not a valid image')
    expect(screen.getByText('b.jpg')).toBeInTheDocument()
  })

  it('uploads a video file', async () => {
    const calls = mockUploadFlow({ complete: () => makeMedia({ kind: 'VIDEO' }) })
    renderWithProviders(<UploadQueue />)
    const user = await choose([video()])
    await user.type(screen.getByLabelText('Alt text for tour.mp4'), 'Studio tour')
    await user.click(screen.getByRole('button', { name: /^upload 1 file/i }))
    await waitFor(() => expect(calls.completed).toHaveLength(1))
    expect(calls.authorised[0]).toMatchObject({ filename: 'tour.mp4', mime: 'video/mp4' })
    expect(calls.puts[0]!.contentType).toBe('video/mp4')
  })

  it('shows the server message for other validation fields', async () => {
    mockUploadFlow({ authorise: () => { throw new ApiError(400, { code: 'VALIDATION', message: 'bad', fields: { file: 'File is missing' } }) } })
    renderWithProviders(<UploadQueue />)
    const user = await choose([file()])
    await user.type(screen.getByLabelText('Alt text for hero.jpg'), 'Alt')
    await user.click(screen.getByRole('button', { name: /^upload 1 file/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('File is missing')
  })

  it('removes a queued file and reports uploaded media', async () => {
    const media = makeMedia({ id: 'new' })
    mockUploadFlow({ complete: () => media })
    const onUploaded = vi.fn()
    renderWithProviders(<UploadQueue onUploaded={onUploaded} />)
    const user = await choose([file('a.jpg'), file('b.jpg')])
    await user.click(screen.getByRole('button', { name: 'Remove b.jpg' }))
    await user.type(screen.getByLabelText('Alt text for a.jpg'), 'Alt')
    await user.click(screen.getByRole('button', { name: /^upload 1 file/i }))
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith(media))
    expect(screen.queryByText('a.jpg')).not.toBeInTheDocument()
  })

  describe('while a run is in progress', () => {
    function gatedUpload() {
      const started: Array<{ name: string; alt: string }> = []
      let release: () => void = () => {}
      let first = true
      mockUploadFlow({ complete: async ({ filename: name, alt }) => {
        started.push({ name, alt })
        if (first) {
          first = false
          await new Promise<void>((resolve) => { release = resolve })
        }
        return makeMedia({ id: name })
      } })
      return { started, release: () => release() }
    }

    it('skips a file removed after the run started', async () => {
      const { started, release } = gatedUpload()
      renderWithProviders(<UploadQueue />)
      const user = await choose([file('a.jpg'), file('b.jpg'), file('c.jpg')])
      for (const name of ['a.jpg', 'b.jpg', 'c.jpg']) await user.type(screen.getByLabelText(`Alt text for ${name}`), 'Alt')
      await user.click(screen.getByRole('button', { name: /^upload 3 files/i }))
      await waitFor(() => expect(started).toHaveLength(1))
      await user.click(screen.getByRole('button', { name: 'Remove c.jpg' }))
      release()
      await waitFor(() => expect(screen.queryByText('b.jpg')).not.toBeInTheDocument())
      expect(started.map((s) => s.name)).toEqual(['a.jpg', 'b.jpg'])
    })

    it('leaves a file whose alt was cleared mid-run in the queue instead of sending an empty alt', async () => {
      const { started, release } = gatedUpload()
      renderWithProviders(<UploadQueue />)
      const user = await choose([file('a.jpg'), file('b.jpg')])
      for (const name of ['a.jpg', 'b.jpg']) await user.type(screen.getByLabelText(`Alt text for ${name}`), 'Alt')
      await user.click(screen.getByRole('button', { name: /^upload 2 files/i }))
      await waitFor(() => expect(started).toHaveLength(1))
      await user.clear(screen.getByLabelText('Alt text for b.jpg'))
      release()
      await waitFor(() => expect(screen.queryByText('a.jpg')).not.toBeInTheDocument())
      expect(started.map((s) => s.name)).toEqual(['a.jpg'])
      expect(screen.getByText('b.jpg')).toBeInTheDocument()
    })

    it('sends alt text edited before the file’s turn', async () => {
      const { started, release } = gatedUpload()
      renderWithProviders(<UploadQueue />)
      const user = await choose([file('a.jpg'), file('b.jpg')])
      for (const name of ['a.jpg', 'b.jpg']) await user.type(screen.getByLabelText(`Alt text for ${name}`), 'Alt')
      await user.click(screen.getByRole('button', { name: /^upload 2 files/i }))
      await waitFor(() => expect(started).toHaveLength(1))
      await user.type(screen.getByLabelText('Alt text for b.jpg'), ' edited')
      release()
      await waitFor(() => expect(started).toHaveLength(2))
      expect(started[1]).toEqual({ name: 'b.jpg', alt: 'Alt edited' })
    })

    it('reports the whole run once, with what was uploaded and how many failed', async () => {
      mockUploadFlow({ complete: ({ filename: name }) => {
        if (name === 'b.jpg') throw new ApiError(400, { code: 'INVALID_IMAGE', message: 'raw' })
        return makeMedia({ id: name })
      } })
      const onRunComplete = vi.fn()
      renderWithProviders(<UploadQueue onRunComplete={onRunComplete} />)
      const user = await choose([file('a.jpg'), file('b.jpg'), file('c.jpg')])
      for (const name of ['a.jpg', 'b.jpg', 'c.jpg']) await user.type(screen.getByLabelText(`Alt text for ${name}`), 'Alt')
      await user.click(screen.getByRole('button', { name: /^upload 3 files/i }))
      await waitFor(() => expect(onRunComplete).toHaveBeenCalledTimes(1))
      const { uploaded, failed } = onRunComplete.mock.calls[0]![0] as { uploaded: Array<{ id: string }>; failed: number }
      expect(uploaded.map((m) => m.id)).toEqual(['a.jpg', 'c.jpg'])
      expect(failed).toBe(1)
    })
  })
})
