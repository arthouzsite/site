import { tooManyRequests } from '@/lib/server/http/errors'
import { MAX_CONCURRENT_UPLOADS } from './media.constants'

let activeUploads = 0

/** Number of uploads currently holding a slot; exposed so tests can prove every exit path releases it. */
export function activeUploadCount(): number {
  return activeUploads
}

/**
 * Uploads are buffered in memory, so only MAX_CONCURRENT_UPLOADS run at once; extra requests get 429 rather than
 * queueing. The slot is released however the task ends.
 */
export async function withUploadSlot<T>(task: () => Promise<T>): Promise<T> {
  if (activeUploads >= MAX_CONCURRENT_UPLOADS) {
    throw tooManyRequests('TOO_MANY_UPLOADS', 'Too many uploads in progress, try again shortly')
  }
  activeUploads += 1
  try {
    return await task()
  } finally {
    activeUploads -= 1
  }
}
