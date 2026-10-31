import { z } from 'zod'
import { parsePagination } from '@/lib/server/common/pagination'
import { route, withMeta } from '@/lib/server/http/route'
import { parseQuery, queryRecord } from '@/lib/server/http/parse'
import { CREATED } from '@/lib/server/http/status'
import * as media from '@/lib/server/media/media.service'
import { readUploadForm } from '@/lib/server/media/upload-request'
import { withUploadSlot } from '@/lib/server/media/upload-slots'

// Large videos are buffered and stored in one request; Next's default function timeout would cut them short.
export const maxDuration = 600

const MAX_SEARCH_LENGTH = 120

const listQuerySchema = z.object({
  q: z.string().trim().max(MAX_SEARCH_LENGTH).optional(),
  kind: z.enum(['image', 'video'], 'Kind must be image or video').optional(),
})

const KIND_BY_QUERY = { image: 'IMAGE', video: 'VIDEO' } as const

export const GET = route('user', async ({ url }) => {
  const { kind, q } = parseQuery(url, listQuerySchema)
  const pagination = parsePagination(queryRecord(url))
  const { items, total } = await media.list({
    q: q || undefined,
    missingAlt: url.searchParams.get('missingAlt') === 'true',
    kind: kind ? KIND_BY_QUERY[kind] : undefined,
    ...pagination,
  })
  return withMeta(items, { total, page: pagination.page, limit: pagination.limit })
})

export const POST = route(
  'user',
  async ({ request, user }) => {
    const { file, alt } = await readUploadForm(request)
    return withUploadSlot(async () =>
      media.upload({ buffer: Buffer.from(await file.arrayBuffer()), mimetype: file.type }, alt, user?.id ?? null),
    )
  },
  { status: CREATED },
)
