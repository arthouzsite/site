import type { ApiEnvelope, EnquiryInput } from '@/lib/shared'

const ENDPOINT = '/api/public/enquiries'
const GENERIC_MESSAGE = 'We could not send your enquiry. Please try again in a moment.'
const OFFLINE_MESSAGE = 'We could not reach the server. Check your connection and try again.'

/** A failed submission: `fields` carries per-field messages when the server rejected specific inputs. */
export class EnquiryError extends Error {
  constructor(
    message: string,
    readonly fields: Record<string, string> = {},
  ) {
    super(message)
    this.name = 'EnquiryError'
  }
}

async function readEnvelope(response: Response): Promise<ApiEnvelope<unknown> | null> {
  try {
    return (await response.json()) as ApiEnvelope<unknown>
  } catch {
    return null
  }
}

/** Posts a validated enquiry to the public endpoint (same origin, no credentials). Resolves when it is stored. */
export async function sendEnquiry(input: EnquiryInput): Promise<void> {
  let response: Response
  try {
    response = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) })
  } catch {
    throw new EnquiryError(OFFLINE_MESSAGE)
  }
  if (response.ok) return
  const error = (await readEnvelope(response))?.error
  throw new EnquiryError(error?.message ?? GENERIC_MESSAGE, error?.fields)
}
