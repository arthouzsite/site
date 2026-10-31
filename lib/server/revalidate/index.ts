import { revalidateTag } from 'next/cache'
import { logError } from '@/lib/server/log'

/** Expires cached site data immediately; a failed expiry must never fail the write that triggered it. */
export function revalidateSite(tags: string[]): void {
  for (const tag of new Set(tags)) {
    try {
      revalidateTag(tag, { expire: 0 })
    } catch (error) {
      logError(`revalidateSite failed for tag "${tag}": ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined)
    }
  }
}
