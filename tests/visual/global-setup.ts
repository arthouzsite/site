import { setArtistIndexLayout } from './artistLayout'
import { API_BASE } from './paths'

const EXPECTED_SEEDED_LOCATIONS = 2

/**
 * Playwright starts the webServer before globalSetup, so its command migrates and seeds the visual
 * database before building (see playwright.config.ts). This step fails fast if that did not happen.
 */
export default async function globalSetup(): Promise<void> {
  const response = await fetch(`${API_BASE}/public/locations`)
  const body = (await response.json()) as { ok: boolean; data: unknown[] | null }
  if (!body.ok || !Array.isArray(body.data) || body.data.length !== EXPECTED_SEEDED_LOCATIONS) {
    throw new Error(`visual global setup: ${API_BASE} is not serving the seeded database (HTTP ${response.status})`)
  }
  // The flowing-layout case flips this setting; an interrupted earlier run must not leave the database in FLOWING.
  await setArtistIndexLayout('GROUPED')
}
