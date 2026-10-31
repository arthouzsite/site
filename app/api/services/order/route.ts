import { reorderSchema } from '@/lib/shared'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { servicesService } from '@/lib/server/services/services.service'

export const PUT = route('user', async ({ request }) => servicesService.reorder((await parseBody(request, reorderSchema)).ids))
