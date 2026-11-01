import { describe, expect, it } from 'vitest'
import { MAX_IMAGE_UPLOAD_BYTES, MAX_VIDEO_UPLOAD_BYTES } from './media.constants'
import { assertUploadAllowed, completeUploadSchema, createUploadSchema, readBoundedBody, readUploadForm } from './upload-request'

const MB = 1024 * 1024

describe('assertUploadAllowed', () => {
  it('accepts an image of exactly 25 MB and a video larger than that', () => {
    expect(() => assertUploadAllowed({ type: 'image/jpeg', size: MAX_IMAGE_UPLOAD_BYTES })).not.toThrow()
    expect(() => assertUploadAllowed({ type: 'video/mp4', size: 30 * MB })).not.toThrow()
    expect(() => assertUploadAllowed({ type: 'video/mp4', size: MAX_VIDEO_UPLOAD_BYTES })).not.toThrow()
  })

  it('rejects an image over 25 MB with 413 PAYLOAD_TOO_LARGE', () => {
    expect(() => assertUploadAllowed({ type: 'image/jpeg', size: MAX_IMAGE_UPLOAD_BYTES + 1 })).toThrow(
      expect.objectContaining({ status: 413, code: 'PAYLOAD_TOO_LARGE' }),
    )
  })

  it('rejects a video over 200 MB with 413 PAYLOAD_TOO_LARGE', () => {
    expect(() => assertUploadAllowed({ type: 'video/webm', size: MAX_VIDEO_UPLOAD_BYTES + 1 })).toThrow(
      expect.objectContaining({ status: 413, code: 'PAYLOAD_TOO_LARGE' }),
    )
  })

  it.each(['image/heic', 'video/x-msvideo', 'application/pdf', ''])('rejects %j with 415', (type) => {
    expect(() => assertUploadAllowed({ type, size: 1 })).toThrow(
      expect.objectContaining({ status: 415, code: 'UNSUPPORTED_MEDIA_TYPE' }),
    )
  })
})

describe('readUploadForm', () => {
  const post = (form: FormData, headers?: Record<string, string>) => new Request('http://localhost/api/media', { method: 'POST', body: form, headers })

  it('returns the file and trimmed alt', async () => {
    const form = new FormData()
    form.set('alt', '  A calm sea ')
    form.set('file', new File([new Uint8Array(4)], 'x.jpg', { type: 'image/jpeg' }))
    const parsed = await readUploadForm(post(form))
    expect(parsed.alt).toBe('A calm sea')
    expect(parsed.file.size).toBe(4)
  })

  it('checks type and size before it validates the fields', async () => {
    const form = new FormData()
    form.set('file', new File([new Uint8Array(1)], 'x.heic', { type: 'image/heic' }))
    await expect(readUploadForm(post(form))).rejects.toMatchObject({ status: 415 })
  })

  it('rejects an alt over 500 characters', async () => {
    const form = new FormData()
    form.set('alt', 'a'.repeat(501))
    form.set('file', new File([new Uint8Array(1)], 'x.jpg', { type: 'image/jpeg' }))
    await expect(readUploadForm(post(form))).rejects.toMatchObject({ issues: [expect.objectContaining({ path: ['alt'] })] })
  })

  it('rejects a declared length beyond the video limit before reading the body', async () => {
    const form = new FormData()
    const request = post(form, { 'content-length': String(MAX_VIDEO_UPLOAD_BYTES + 2 * MB) })
    await expect(readUploadForm(request)).rejects.toMatchObject({ status: 413 })
  })

  it('rejects a chunked body with no Content-Length once it passes the limit, cancelling the source', async () => {
    const CHUNK = 8 * MB
    let sent = 0
    let isCancelled = false
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        sent += CHUNK
        controller.enqueue(new Uint8Array(CHUNK))
      },
      cancel() {
        isCancelled = true
      },
    })
    const request = new Request('http://localhost/api/media', {
      method: 'POST',
      body,
      headers: { 'content-type': 'multipart/form-data; boundary=x' },
      duplex: 'half',
    } as RequestInit)
    expect(request.headers.get('content-length')).toBeNull()

    await expect(readUploadForm(request)).rejects.toMatchObject({ status: 413, code: 'PAYLOAD_TOO_LARGE' })

    expect(isCancelled).toBe(true)
    expect(sent).toBeLessThan(MAX_VIDEO_UPLOAD_BYTES + 6 * CHUNK)
  })

  it('rejects a request with no body as 400 BAD_REQUEST', async () => {
    const request = new Request('http://localhost/api/media', { method: 'POST' })
    await expect(readUploadForm(request)).rejects.toMatchObject({ status: 400, code: 'BAD_REQUEST' })
  })
})

describe('readBoundedBody', () => {
  const putRequest = (body: BodyInit | null, headers: Record<string, string> = {}) =>
    new Request('http://localhost/x', { method: 'PUT', body, headers, duplex: 'half' } as RequestInit)

  it('returns the bytes of a body within the limit', async () => {
    await expect(readBoundedBody(putRequest('hello'), 5)).resolves.toEqual(Buffer.from('hello'))
  })

  it('returns an empty buffer for a request with no body', async () => {
    await expect(readBoundedBody(new Request('http://localhost/x', { method: 'PUT' }), 5)).resolves.toEqual(Buffer.alloc(0))
  })

  it('rejects a body over the limit with 413, counting the stream when no length is declared', async () => {
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(4))
      },
    })
    await expect(readBoundedBody(putRequest(stream), 10)).rejects.toMatchObject({ status: 413, code: 'PAYLOAD_TOO_LARGE' })
  })

  it('rejects early on a declared content-length over the limit', async () => {
    await expect(readBoundedBody(putRequest('x', { 'content-length': '999' }), 10)).rejects.toMatchObject({ status: 413 })
  })
})

describe('upload body schemas', () => {
  const key = 'arthouz/2026/12345678-1234-1234-1234-123456789012.png'

  it('trims alt and requires it on both bodies', () => {
    expect(createUploadSchema.parse({ filename: ' a.png ', mime: 'image/png', bytes: 3, alt: ' hi ' })).toMatchObject({ filename: 'a.png', alt: 'hi' })
    expect(completeUploadSchema.parse({ key, alt: ' hi ' }).alt).toBe('hi')
    expect(() => completeUploadSchema.parse({ key, alt: '' })).toThrow()
    expect(() => completeUploadSchema.parse({ key, alt: 'x'.repeat(501) })).toThrow()
  })

  it('rejects a complete body whose key is not an upload key', () => {
    expect(() => completeUploadSchema.parse({ key: 'arthouz/2026/10/x.png', alt: 'a' })).toThrow()
  })
})
