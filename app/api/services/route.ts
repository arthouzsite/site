import { serviceInputSchema } from '@/lib/shared'
import { parseBody, parseQuery } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { serviceListQuerySchema, servicesService } from '@/lib/server/services/services.service'

const CREATED = 201

export const GET = route('user', ({ url }) => servicesService.list(parseQuery(url, serviceListQuerySchema)))

export const POST = route('user', async ({ request }) => servicesService.create(await parseBody(request, serviceInputSchema)), { status: CREATED })
