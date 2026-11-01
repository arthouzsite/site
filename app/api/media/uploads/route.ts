import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { CREATED } from '@/lib/server/http/status'
import { createUpload } from '@/lib/server/media/direct-upload.service'
import { createUploadSchema } from '@/lib/server/media/upload-request'

/** Step 1 of a browser-to-bucket upload: validates the file's declared type and size, returns where to PUT it. */
export const POST = route(
  'user',
  async ({ request }) => createUpload(await parseBody(request, createUploadSchema)),
  { status: CREATED },
)
