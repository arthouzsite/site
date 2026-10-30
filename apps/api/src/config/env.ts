import 'dotenv/config'
import { z } from 'zod'

const DEFAULT_PORT = 4100
const MIN_JWT_SECRET_LENGTH = 32
const DEFAULT_ADMIN_ORIGIN = 'http://localhost:5180'
const DEFAULT_WEB_URL = 'http://localhost:3100'
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const R2_SETTINGS = ['S3_ENDPOINT', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_BUCKET_NAME', 'AWS_S3_PUBLIC_URL'] as const

const optionalString = z.string().min(1).optional()

const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),
  DATABASE_URL: z.string().min(1),
  DATABASE_URL_TEST: optionalString,
  JWT_SECRET: z.string().min(MIN_JWT_SECRET_LENGTH),
  ADMIN_ORIGIN: z.string().url().default(DEFAULT_ADMIN_ORIGIN),
  WEB_URL: z.string().url().default(DEFAULT_WEB_URL),
  REVALIDATE_SECRET: z.string().min(1),
  STORAGE_DRIVER: z.enum(['r2', 'memory']).optional(),
  S3_ENDPOINT: optionalString,
  AWS_ACCESS_KEY_ID: optionalString,
  AWS_SECRET_ACCESS_KEY: optionalString,
  AWS_S3_BUCKET_NAME: optionalString,
  AWS_S3_PUBLIC_URL: optionalString,
  SEED_ADMIN_EMAIL: z.string().email(),
  SEED_ADMIN_PASSWORD: z.string().min(1),
  TODAY_OVERRIDE: z.string().regex(ISO_DATE_PATTERN, 'Expected YYYY-MM-DD').optional(),
})

const envSchema = baseSchema
  .transform((raw) => ({
    ...raw,
    STORAGE_DRIVER: raw.STORAGE_DRIVER ?? (raw.NODE_ENV === 'test' ? ('memory' as const) : ('r2' as const)),
  }))
  .superRefine((value, ctx) => {
    if (value.STORAGE_DRIVER !== 'r2') return
    for (const key of R2_SETTINGS) {
      if (!value[key]) {
        ctx.addIssue({ code: 'custom', path: [key], message: `${key} is required when STORAGE_DRIVER=r2` })
      }
    }
  })

export type Env = z.infer<typeof envSchema>

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    const details = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n  ')
    throw new Error(`Invalid environment configuration:\n  ${details}`)
  }
  return result.data
}

export const env: Env = parseEnv(process.env)
