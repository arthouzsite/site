export interface Storage {
  put(key: string, body: Buffer, contentType: string): Promise<{ url: string }>
  delete(key: string): Promise<void>
}
