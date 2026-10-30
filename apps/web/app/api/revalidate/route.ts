import { createHash, timingSafeEqual } from 'node:crypto'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'

const MAX_TAGS = 100
const bodySchema = z.object({ tags: z.array(z.string().min(1).max(200)).max(MAX_TAGS) })

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest()
}

/** Constant-time comparison; hashing first equalises lengths so the length is not leaked either. */
function secretMatches(provided: string | null): boolean {
  const expected = process.env.REVALIDATE_SECRET
  if (!expected || !provided) return false
  return timingSafeEqual(digest(provided), digest(expected))
}

function failure(status: number, code: string, message: string): Response {
  return Response.json({ ok: false, data: null, error: { code, message } }, { status })
}

export async function POST(request: Request): Promise<Response> {
  if (!secretMatches(request.headers.get('x-revalidate-secret'))) {
    return failure(401, 'UNAUTHORIZED', 'Invalid revalidate secret')
  }
  const json: unknown = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return failure(400, 'VALIDATION_ERROR', 'Body must be { tags: string[] }')
  }
  const revalidated = [...new Set(parsed.data.tags)]
  // Expire immediately: CMS edits should show on the very next request, not after a stale render.
  revalidated.forEach((tag) => revalidateTag(tag, { expire: 0 }))
  return Response.json({ ok: true, data: { revalidated }, error: null })
}
