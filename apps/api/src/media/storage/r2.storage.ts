import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Logger } from '@nestjs/common'
import type { Env } from '../../config/env'
import { CACHE_CONTROL } from '../media.constants'
import type { Storage } from './storage.interface'

export type R2Config = {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  publicUrl: string
}

export class R2Storage implements Storage {
  private readonly logger = new Logger(R2Storage.name)
  private readonly client: S3Client

  constructor(private readonly config: R2Config) {
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    })
  }

  static fromEnv(source: Env): R2Storage {
    const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = source
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL) {
      throw new Error('R2 storage requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL')
    }
    return new R2Storage({
      accountId: R2_ACCOUNT_ID,
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
      bucket: R2_BUCKET,
      publicUrl: R2_PUBLIC_URL.replace(/\/+$/, ''),
    })
  }

  async put(key: string, body: Buffer, contentType: string): Promise<{ url: string }> {
    try {
      await this.client.send(
        new PutObjectCommand({ Bucket: this.config.bucket, Key: key, Body: body, ContentType: contentType, CacheControl: CACHE_CONTROL }),
      )
    } catch (error) {
      this.logger.error(`R2 put failed for ${key}`, error instanceof Error ? error.stack : String(error))
      throw error
    }
    return { url: `${this.config.publicUrl}/${key}` }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }))
    } catch (error) {
      this.logger.error(`R2 delete failed for ${key}`, error instanceof Error ? error.stack : String(error))
      throw error
    }
  }
}
