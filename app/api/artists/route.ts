import { artistInputSchema } from '@/lib/shared'
import { artistListQuerySchema } from '@/lib/server/artists/artists.query'
import { createArtist, listArtists } from '@/lib/server/artists/artists.service'
import { parseBody, parseQuery } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { CREATED } from '@/lib/server/http/status'

export const GET = route('user', ({ url }) => listArtists(parseQuery(url, artistListQuerySchema)))

export const POST = route('user', async ({ request }) => createArtist(await parseBody(request, artistInputSchema)), { status: CREATED })
