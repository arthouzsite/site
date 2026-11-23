import { reorderSchema } from '@/lib/shared'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { printsService } from '@/lib/server/prints/prints.service'

export const PUT = route('user', async ({ request }) => printsService.reorder((await parseBody(request, reorderSchema)).ids))
