import { publicRoute } from '@/lib/server/public/public-route'
import { publicReads } from '@/lib/server/public/public-reads'
import { parseQuery } from '@/lib/server/http/parse'
import { publicQSchema } from '@/lib/server/public/public.queries'

export const GET = publicRoute(({ url }) => publicReads.search(parseQuery(url, publicQSchema).q))
