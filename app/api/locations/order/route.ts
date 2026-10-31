import { reorderSchema } from '@/lib/shared'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import * as locations from '@/lib/server/locations/locations.service'

export const PUT = route('user', async ({ request }) => locations.reorder((await parseBody(request, reorderSchema)).ids))
