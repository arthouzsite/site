import { parseQuery } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { enquiriesService, enquiryListQuerySchema } from '@/lib/server/enquiries/enquiries.service'

export const GET = route('user', ({ url }) => enquiriesService.list(parseQuery(url, enquiryListQuerySchema)))
