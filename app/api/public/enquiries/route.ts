import { enquiryInputSchema } from '@/lib/shared'
import { assertBrowserSameOrigin } from '@/lib/server/auth/origin'
import { clientIp } from '@/lib/server/auth/client-ip'
import { ENQUIRY_BODY_MAX_BYTES, ENQUIRY_BODY_TOO_LARGE } from '@/lib/server/enquiries/enquiries.constants'
import { enquiriesService } from '@/lib/server/enquiries/enquiries.service'
import { badRequest } from '@/lib/server/http/errors'
import { parseObject } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { CREATED } from '@/lib/server/http/status'
import { readBoundedBody } from '@/lib/server/media/upload-request'

async function readEnquiry(request: Request) {
  const bytes = await readBoundedBody(request, ENQUIRY_BODY_MAX_BYTES, ENQUIRY_BODY_TOO_LARGE)
  let raw: unknown
  try {
    raw = JSON.parse(bytes.toString('utf8'))
  } catch {
    throw badRequest('BAD_REQUEST', 'Body must be a JSON object')
  }
  return parseObject(raw, enquiryInputSchema)
}

/**
 * Unauthenticated. `route` rejects a foreign Origin; this endpoint additionally refuses requests that identify as
 * no origin at all (only the site's own form posts here). The body is read with a 16 KB cap, then the service
 * applies the honeypot, target checks and the per-address throttle.
 */
export const POST = route(
  'public',
  async ({ request }) => {
    assertBrowserSameOrigin(request)
    return enquiriesService.submit(await readEnquiry(request), clientIp(request))
  },
  { status: CREATED },
)
