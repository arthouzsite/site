import { Injectable, Logger } from '@nestjs/common'
import { env } from '../config/env'

const REVALIDATE_PATH = '/api/revalidate'
const SECRET_HEADER = 'x-revalidate-secret'

@Injectable()
export class RevalidateService {
  private readonly logger = new Logger(RevalidateService.name)

  trigger(tags: string[]): void {
    const unique = Array.from(new Set(tags))
    if (unique.length === 0) return
    void this.post(unique).catch((error: unknown) => {
      this.logger.warn(`Revalidate failed for [${unique.join(', ')}]: ${String(error)}`)
    })
  }

  private async post(tags: string[]): Promise<void> {
    const response = await fetch(`${env.WEB_URL}${REVALIDATE_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', [SECRET_HEADER]: env.REVALIDATE_SECRET },
      body: JSON.stringify({ tags }),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
  }
}
