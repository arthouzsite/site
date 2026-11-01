import { env } from '@/lib/server/env'
import { MemoryStorage } from './memory.storage'
import { R2Storage } from './r2.storage'
import type { Storage } from './storage.interface'

/** The one in-memory store of a non-r2 run; tests import it to inspect what was written. */
export const memoryStorage = new MemoryStorage(env.MEDIA_URL_BASE)

let r2Storage: R2Storage | undefined

/** Picks the driver from STORAGE_DRIVER on first use, so a missing R2 setting fails the upload, not the import. */
export function getStorage(): Storage {
  if (env.STORAGE_DRIVER !== 'r2') return memoryStorage
  r2Storage ??= R2Storage.fromEnv(env)
  return r2Storage
}
