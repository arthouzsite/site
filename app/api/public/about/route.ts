import { publicRoute } from '@/lib/server/public/public-route'
import { publicReads } from '@/lib/server/public/public-reads'

export const GET = publicRoute(() => publicReads.getAbout())
