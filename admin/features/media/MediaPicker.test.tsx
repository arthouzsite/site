import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { API_URL, HttpResponse, envelope, http, server } from '../../test/msw'
import { ImageField } from './ImageField'
import { MediaPicker } from './MediaPicker'
import { api, ApiError } from '../../lib/api'
import { makeMedia, renderWithProviders } from './testUtils'
import { toMediaRef } from './types'

const items = [makeMedia(), makeMedia({ id: 'm2', alt: 'Second', key: 'media/second.jpg' }), makeMedia({ id: 'm3', alt: '', key: 'media/noalt.jpg' })]

function listHandler() {
  server.use(
    http.get(`${API_URL}/media`, ({ request }) => {
      const q = new URL(request.url).searchParams.get('q')
      const data = q ? items.filter((i) => i.key.includes(q)) : items
      return HttpResponse.json({ ...envelope(data), meta: { total: data.length, page: 1, limit: 12 } })
    }),
  )
}

describe('MediaPicker', () => {
  it('picker returns the selected MediaRef', async () => {
    listHandler()
    const onSelect = vi.fn()
    renderWithProviders(<MediaPicker open onClose={() => {}} onSelect={onSelect} />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('option', { name: /second\.jpg/i }))
    await user.click(screen.getByRole('button', { name: 'Use this image' }))
    expect(onSelect).toHaveBeenCalledWith(toMediaRef(items[1]!))
  })

  it('only requests images so videos are never offered', async () => {
    const kinds: (string | null)[] = []
    server.use(
      http.get(`${API_URL}/media`, ({ request }) => {
        kinds.push(new URL(request.url).searchParams.get('kind'))
        return HttpResponse.json({ ...envelope(items), meta: { total: items.length, page: 1, limit: 12 } })
      }),
    )
    renderWithProviders(<MediaPicker open onClose={() => {}} onSelect={vi.fn()} />)
    await screen.findByRole('option', { name: /second\.jpg/i })
    expect(kinds.length).toBeGreaterThan(0)
    expect(new Set(kinds)).toEqual(new Set(['image']))
  })

  it('blocks images without alt text and filters by search', async () => {
    listHandler()
    renderWithProviders(<MediaPicker open onClose={() => {}} onSelect={vi.fn()} />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('option', { name: /noalt\.jpg/i }))
    expect(screen.getByRole('button', { name: 'Use this image' })).toBeDisabled()
    await user.type(screen.getByLabelText('Search by file name or alt text'), 'second')
    await waitFor(() => expect(screen.queryByRole('option', { name: /noalt\.jpg/i })).not.toBeInTheDocument())
    expect(screen.getByRole('option', { name: /second\.jpg/i })).toBeInTheDocument()
  })

  it('traps focus and closes on Escape', async () => {
    listHandler()
    const onClose = vi.fn()
    renderWithProviders(<MediaPicker open onClose={onClose} onSelect={vi.fn()} />)
    const user = userEvent.setup()
    await screen.findByRole('option', { name: /second\.jpg/i })
    for (let i = 0; i < 20; i++) await user.tab()
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})

describe('MediaPicker upload tab', () => {
  async function openUpload() {
    listHandler()
    const onSelect = vi.fn()
    renderWithProviders(<MediaPicker open onClose={() => {}} onSelect={onSelect} />)
    // applyAccept off: a user can still pick any file through an "All files" OS dialog or drag and drop.
    const user = userEvent.setup({ applyAccept: false })
    await user.click(await screen.findByRole('tab', { name: 'Upload' }))
    return { user, onSelect }
  }

  it('offers images only', async () => {
    await openUpload()
    expect(screen.getByLabelText(/choose files/i)).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp,image/avif')
    expect(screen.getByText('JPEG, PNG, WebP or AVIF up to 25 MB')).toBeInTheDocument()
  })

  it('refuses to select an uploaded video and explains why', async () => {
    vi.spyOn(api, 'upload').mockResolvedValue(makeMedia({ id: 'v1', kind: 'VIDEO', mime: 'video/mp4', key: 'media/v1.mp4', alt: 'Tour' }))
    const { user, onSelect } = await openUpload()
    await user.upload(screen.getByLabelText(/choose files/i), new File(['x'], 'tour.mp4', { type: 'video/mp4' }))
    await user.type(screen.getByLabelText('Alt text for tour.mp4'), 'Tour')
    await user.click(screen.getByRole('button', { name: /^upload 1 file/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Only images can be used here')
    expect(screen.getByRole('button', { name: 'Use this image' })).toBeDisabled()
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('stays on the upload tab until the last file is done, then selects it in the library', async () => {
    const releases: Array<() => void> = []
    vi.spyOn(api, 'upload').mockImplementation(async (_p, form) => {
      const name = ((form as FormData).get('file') as File).name
      await new Promise<void>((resolve) => { releases.push(resolve) })
      return makeMedia({ id: name, alt: 'Alt', key: `media/${name}` })
    })
    const { user, onSelect } = await openUpload()
    await user.upload(screen.getByLabelText(/choose files/i), [new File(['x'], 'one.jpg', { type: 'image/jpeg' }), new File(['x'], 'two.jpg', { type: 'image/jpeg' })])
    await user.type(screen.getByLabelText('Alt text for one.jpg'), 'Alt')
    await user.type(screen.getByLabelText('Alt text for two.jpg'), 'Alt')
    await user.click(screen.getByRole('button', { name: /^upload 2 files/i }))
    await waitFor(() => expect(releases).toHaveLength(1))
    releases[0]!()
    await waitFor(() => expect(releases).toHaveLength(2))
    expect(screen.getByRole('tab', { name: 'Upload' })).toHaveAttribute('aria-selected', 'true')
    releases[1]!()
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Library' })).toHaveAttribute('aria-selected', 'true'))
    await user.click(screen.getByRole('button', { name: 'Use this image' }))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'two.jpg' }))
  })

  it('stays on the upload tab when a file failed so the error stays visible', async () => {
    vi.spyOn(api, 'upload').mockImplementation(async (_p, form) => {
      const name = ((form as FormData).get('file') as File).name
      if (name === 'bad.jpg') throw new ApiError(400, { code: 'INVALID_IMAGE', message: 'raw' })
      return makeMedia({ id: name, alt: 'Alt' })
    })
    const { user } = await openUpload()
    await user.upload(screen.getByLabelText(/choose files/i), [new File(['x'], 'good.jpg', { type: 'image/jpeg' }), new File(['x'], 'bad.jpg', { type: 'image/jpeg' })])
    await user.type(screen.getByLabelText('Alt text for good.jpg'), 'Alt')
    await user.type(screen.getByLabelText('Alt text for bad.jpg'), 'Alt')
    await user.click(screen.getByRole('button', { name: /^upload 2 files/i }))
    expect(await screen.findAllByRole('alert')).not.toHaveLength(0)
    expect(screen.getByText('This file is not a valid image.')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Upload' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: 'Use this image' })).toBeEnabled()
  })

  it('selects an uploaded image and returns to the library', async () => {
    vi.spyOn(api, 'upload').mockResolvedValue(makeMedia({ id: 'new', alt: 'Fresh' }))
    const { user, onSelect } = await openUpload()
    await user.upload(screen.getByLabelText(/choose files/i), new File(['x'], 'fresh.jpg', { type: 'image/jpeg' }))
    await user.type(screen.getByLabelText('Alt text for fresh.jpg'), 'Fresh')
    await user.click(screen.getByRole('button', { name: /^upload 1 file/i }))
    await user.click(await screen.findByRole('button', { name: 'Use this image' }))
    expect(onSelect).toHaveBeenCalledWith(toMediaRef(makeMedia({ id: 'new', alt: 'Fresh' })))
  })
})

describe('ImageField', () => {
  it('shows choose/replace/remove and applies the picked image', async () => {
    listHandler()
    const onChange = vi.fn()
    const { rerender } = renderWithProviders(<ImageField label="Hero image" value={null} onChange={onChange} ratio="3/2" />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Choose image' }))
    await user.click(await screen.findByRole('option', { name: /second\.jpg/i }))
    await user.click(screen.getByRole('button', { name: 'Use this image' }))
    expect(onChange).toHaveBeenCalledWith(toMediaRef(items[1]!))
    rerender(<ImageField label="Hero image" value={toMediaRef(items[0]!)} onChange={onChange} ratio="3/2" />)
  })

  it('removes the image', async () => {
    const onChange = vi.fn()
    renderWithProviders(<ImageField label="Hero image" help="Shown on top" value={toMediaRef(items[0]!)} onChange={onChange} ratio="3/2" />)
    expect(screen.getByRole('button', { name: 'Replace' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(onChange).toHaveBeenCalledWith(null)
    expect(screen.getByText('Shown on top')).toBeInTheDocument()
  })
})
