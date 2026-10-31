import { locationInputSchema } from '@/lib/shared'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { CREATED } from '@/lib/server/http/status'
import * as locations from '@/lib/server/locations/locations.service'

export const GET = route('user', () => locations.list())

export const POST = route('user', async ({ request }) => locations.create(await parseBody(request, locationInputSchema)), { status: CREATED })
