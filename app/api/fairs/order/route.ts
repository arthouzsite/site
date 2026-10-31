import { reorderSchema } from '@/lib/shared'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { fairsService } from '@/lib/server/fairs/fairs.service'

export const PUT = route('user', async ({ request }) => fairsService.reorder((await parseBody(request, reorderSchema)).ids))
