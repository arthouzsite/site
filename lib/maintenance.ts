import { unstable_rethrow } from 'next/navigation'
import { getSettings } from './site-data'

/**
 * True while the CMS has the maintenance break switched on. If the settings cannot be read the site stays open:
 * a failed read must not close it.
 */
export async function isUnderMaintenance(): Promise<boolean> {
  try {
    return (await getSettings()).maintenance.isEnabled
  } catch (error) {
    // A build-time `connection()` bail-out is not a failure: rethrow it so the page renders per request.
    unstable_rethrow(error)
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    console.error(`[web] maintenance setting unavailable, keeping the site open: ${detail}`)
    return false
  }
}
