import { serveMedia } from '@/lib/server/media/serve-media'
import { getStorage } from '@/lib/server/media/storage/storage.provider'

// Public asset path: no session, no API envelope. Objects stream from the private bucket on every cache miss.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ key: string[] }> }

async function handle(request: Request, { params }: Context): Promise<Response> {
  const { key } = await params
  return serveMedia(request, key, getStorage())
}

export const GET = handle
export const HEAD = handle
