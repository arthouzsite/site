import { enquiryHandledSchema } from '@/lib/shared'
import { enquiriesService } from '@/lib/server/enquiries/enquiries.service'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'

type Params = { id: string }

export const PATCH = route<Params>('user', async ({ params, request }) =>
  enquiriesService.setHandled(params.id, (await parseBody(request, enquiryHandledSchema)).isHandled),
)

export const DELETE = route<Params>('user', ({ params }) => enquiriesService.remove(params.id))
