const MS_PER_MINUTE = 60_000
const BYTES_PER_KB = 1024

const THROTTLE_TTL = 10 * MS_PER_MINUTE

/**
 * Per client address (IPv6 by its /64): at most `limit` stored-bound submissions in each `ttl` window. A
 * submission is counted once its target and location checked out; honeypot hits, invalid bodies, unknown
 * slugs and unknown locations do not use a slot.
 */
export const ENQUIRY_THROTTLE = { limit: 5, ttl: THROTTLE_TTL } as const
/** Site-wide cap used instead when the client address is unknown (TRUST_PROXY=0), so one script cannot lock everyone out. */
export const ENQUIRY_SITEWIDE_THROTTLE = { limit: 60, ttl: THROTTLE_TTL } as const
export const ENQUIRY_THROTTLE_KEY_PREFIX = 'enquiry:'
export const ENQUIRY_THROTTLED_MESSAGE = 'Too many enquiries from your network. Please try again in a few minutes.'
export const ENQUIRY_FAILED_MESSAGE = 'Enquiry could not be saved'
/** A real enquiry is a few hundred bytes (message capped at 2000 characters); anything bigger is refused unread. */
export const ENQUIRY_BODY_MAX_BYTES = 16 * BYTES_PER_KB
export const ENQUIRY_BODY_TOO_LARGE = 'Enquiry is too large'
