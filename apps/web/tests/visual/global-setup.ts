import { API_URL } from './paths'

const EXPECTED_SEEDED_LOCATIONS = 2

/**
 * Playwright starts webServers before globalSetup, so the API command itself migrates and seeds
 * the visual database (see playwright.config.ts). This step fails fast if that did not happen.
 */
export default async function globalSetup(): Promise<void> {
  const response = await fetch(`${API_URL}/public/locations`)
  const body = (await response.json()) as { ok: boolean; data: unknown[] | null }
  if (!body.ok || !Array.isArray(body.data) || body.data.length !== EXPECTED_SEEDED_LOCATIONS) {
    throw new Error(`visual global setup: ${API_URL} is not serving the seeded database (HTTP ${response.status})`)
  }
}
