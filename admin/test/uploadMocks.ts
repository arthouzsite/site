import { makeMedia } from '../features/media/testUtils'
import type { Media } from '../features/media/types'
import { ApiError } from '../lib/api'
import { API_URL, HttpResponse, errorEnvelope, envelope, http, server } from './msw'

export type UploadInfo = { filename: string; mime: string; bytes: number; alt: string }

type Options = {
  /** Resolves the Media row for the `complete` step; throw an ApiError to fail it. */
  complete?: (info: UploadInfo) => Media | Promise<Media>
  /** Runs at the authorise step; throw an ApiError to refuse the upload. */
  authorise?: (info: UploadInfo) => void
  /** Overrides the target URL, e.g. an absolute R2 URL. */
  targetUrl?: (key: string) => string
}

export type UploadCalls = {
  authorised: UploadInfo[]
  puts: Array<{ key: string; contentType: string | null; bytes: number }>
  completed: Array<{ key: string; alt: string }>
}

const failure = (err: ApiError) =>
  HttpResponse.json(errorEnvelope(err.code, err.message, err.fields), { status: err.status })

/** MSW handlers for the three-step presigned flow (authorise, same-origin PUT, complete). */
export function mockUploadFlow(options: Options = {}): UploadCalls {
  const calls: UploadCalls = { authorised: [], puts: [], completed: [] }
  const infoByKey = new Map<string, UploadInfo>()
  const complete = options.complete ?? ((info: UploadInfo) => makeMedia({ alt: info.alt }))
  const targetUrl = options.targetUrl ?? ((key: string) => `/api/media/uploads/${key}`)

  server.use(
    http.post(`${API_URL}/media/uploads`, async ({ request }) => {
      const info = (await request.json()) as UploadInfo
      try {
        options.authorise?.(info)
      } catch (err) {
        if (err instanceof ApiError) return failure(err)
        throw err
      }
      calls.authorised.push(info)
      const key = `arthouz/2026/${info.filename}`
      infoByKey.set(key, info)
      return HttpResponse.json(
        envelope({
          key,
          method: 'PUT',
          url: targetUrl(key),
          headers: { 'content-type': info.mime },
          expiresAt: '2026-11-01T12:15:00.000Z',
        }),
        { status: 201 },
      )
    }),
    http.put(`${API_URL}/media/uploads/*`, async ({ request, params }) => {
      const key = [params['0']].flat().join('/')
      calls.puts.push({ key, contentType: request.headers.get('content-type'), bytes: (await request.arrayBuffer()).byteLength })
      return new HttpResponse(null, { status: 200 })
    }),
    http.post(`${API_URL}/media/uploads/complete`, async ({ request }) => {
      const body = (await request.json()) as { key: string; alt: string }
      calls.completed.push(body)
      try {
        const media = await complete({ ...infoByKey.get(body.key)!, alt: body.alt })
        return HttpResponse.json(envelope(media), { status: 201 })
      } catch (err) {
        if (err instanceof ApiError) return failure(err)
        throw err
      }
    }),
  )
  return calls
}
