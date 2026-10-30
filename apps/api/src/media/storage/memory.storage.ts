import type { Storage } from './storage.interface'

export class MemoryStorage implements Storage {
  private readonly objects = new Map<string, { body: Buffer; contentType: string }>()

  async put(key: string, body: Buffer, contentType: string): Promise<{ url: string }> {
    this.objects.set(key, { body, contentType })
    return { url: `memory://${key}` }
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key)
  }

  has(key: string): boolean {
    return this.objects.has(key)
  }
}
