import type { Provider } from '@nestjs/common'
import { env } from '../../config/env'
import { MemoryStorage } from './memory.storage'
import { R2Storage } from './r2.storage'
import { STORAGE, type Storage } from './storage.interface'

export const storageProvider: Provider<Storage> = {
  provide: STORAGE,
  useFactory: () => (env.STORAGE_DRIVER === 'r2' ? R2Storage.fromEnv(env) : new MemoryStorage()),
}
