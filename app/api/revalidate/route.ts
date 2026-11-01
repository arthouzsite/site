import { z } from 'zod'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { revalidateSite } from '@/lib/server/revalidate'
import { allSiteTags } from '@/lib/server/revalidate/all-tags'

const MAX_TAGS = 200
const MAX_TAG_LENGTH = 200

const bodySchema = z.object({ tags: z.array(z.string().min(1).max(MAX_TAG_LENGTH)).min(1).max(MAX_TAGS).optional() })

/** The body is optional: an empty request expires every tag. */
async function readTags(request: Request): Promise<string[] | undefined> {
  const hasBody = (await request.clone().text()).trim() !== ''
  return hasBody ? (await parseBody(request, bodySchema)).tags : undefined
}

/** Admin-only: expires the site data cache (all tags, or just the given ones) after out-of-band changes. */
export const POST = route('admin', async ({ request }) => {
  const tags = (await readTags(request)) ?? (await allSiteTags())
  revalidateSite(tags)
  return { revalidated: new Set(tags).size }
})
