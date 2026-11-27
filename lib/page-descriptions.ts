import type { DescribedPage } from '@/lib/shared'
import { unstable_rethrow } from 'next/navigation'
import { getSettings } from './site-data'

/**
 * The description the CMS holds for a section page, or '' when there is none. If the settings cannot be read the
 * page renders without it: a failed read must not take the page down.
 */
export async function loadPageDescription(page: DescribedPage): Promise<string> {
  try {
    return (await getSettings()).pageDescriptions[page]
  } catch (error) {
    // A build-time `connection()` bail-out is not a failure: rethrow it so the page renders per request.
    unstable_rethrow(error)
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    console.error(`[web] page description unavailable for ${page}: ${detail}`)
    return ''
  }
}
