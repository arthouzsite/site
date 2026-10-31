import { z } from 'zod'
import { setFeaturedOrder } from '@/lib/server/artists/artists.service'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'

const featuredOrderSchema = z.object({ ids: z.array(z.string().uuid()) })

export const PUT = route('user', async ({ request }) => setFeaturedOrder((await parseBody(request, featuredOrderSchema)).ids))
