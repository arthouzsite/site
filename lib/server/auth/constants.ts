export const SESSION_COOKIE = 'ah_session'
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
export const SEVEN_DAYS_SECONDS = SEVEN_DAYS_MS / 1000
export const LOGIN_THROTTLE = { limit: 5, ttl: 60_000 } as const
export const MUTATING_METHODS: ReadonlySet<string> = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
