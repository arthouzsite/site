import { publicRoute } from '@/lib/server/public/public-route'
import { publicReads } from '@/lib/server/public/public-reads'
import { parseQuery } from '@/lib/server/http/parse'
import { publicExhibitionsQuerySchema } from '@/lib/server/public/public.queries'

export const GET = publicRoute(({ url }) => publicReads.getExhibitions(parseQuery(url, publicExhibitionsQuerySchema)))
