import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { CREATED } from '@/lib/server/http/status'
import { completeUpload } from '@/lib/server/media/direct-upload.service'
import { completeUploadSchema } from '@/lib/server/media/upload-request'

// Decoding a large image and storing its thumbnail can outlast the default function timeout.
export const maxDuration = 60

/** Step 3: verifies the uploaded object and records it as a Media row. */
export const POST = route(
  'user',
  async ({ request, user }) => completeUpload(await parseBody(request, completeUploadSchema), user?.id ?? null),
  { status: CREATED },
)
