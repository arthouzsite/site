import { SEED_ADMIN } from './env'
import { PORT_URL } from './paths'

/** Signs in as the seeded admin and returns the session cookie pair (`name=value`) for later requests. */
async function signIn(): Promise<string> {
  const response = await fetch(`${PORT_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(SEED_ADMIN),
  })
  const cookie = response.headers.getSetCookie()[0]?.split(';')[0]
  if (!response.ok || !cookie) throw new Error(`visual settings: sign-in failed with HTTP ${response.status}`)
  return cookie
}

/** Writes a setting through the CMS API, which also expires the cached site pages that read it. */
export async function putSetting(key: string, value: unknown): Promise<void> {
  const cookie = await signIn()
  const response = await fetch(`${PORT_URL}/api/settings/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ value }),
  })
  if (!response.ok) throw new Error(`visual settings: PUT ${key} failed with HTTP ${response.status}`)
}
