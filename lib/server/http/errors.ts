import { ZodError } from 'zod'
import { fail, type ApiEnvelope } from '@/lib/shared'
import { Prisma } from '@/lib/server/generated/prisma/client'
import { logError } from '@/lib/server/log'

const PRISMA_UNIQUE_VIOLATION = 'P2002'
const PRISMA_RECORD_NOT_FOUND = 'P2025'
const PRISMA_FOREIGN_KEY_VIOLATION = 'P2003'
const REFERENCED_MESSAGE = 'Record is referenced by other content'
const INTERNAL_MESSAGE = 'Something went wrong'

export class ApiException extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiException'
  }
}

export const badRequest = (code: string, message: string, details?: unknown): ApiException =>
  new ApiException(400, code, message, undefined, details)

export const unauthorized = (message = 'Please sign in again', code = 'UNAUTHORIZED'): ApiException =>
  new ApiException(401, code, message)

export const forbidden = (message: string, code = 'FORBIDDEN'): ApiException => new ApiException(403, code, message)

export const notFound = (message = 'Record not found'): ApiException => new ApiException(404, 'NOT_FOUND', message)

export const conflict = (code: string, message: string, details?: unknown): ApiException =>
  new ApiException(409, code, message, undefined, details)

export const tooManyRequests = (code: string, message: string): ApiException => new ApiException(429, code, message)

export const payloadTooLarge = (message: string): ApiException => new ApiException(413, 'PAYLOAD_TOO_LARGE', message)

export const unsupportedMediaType = (message: string): ApiException =>
  new ApiException(415, 'UNSUPPORTED_MEDIA_TYPE', message)

export type MappedError = { status: number; body: ApiEnvelope<null> }

export function zodFields(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) {
    const path = issue.path.join('.')
    if (!(path in fields)) fields[path] = issue.message
  }
  return fields
}

function fromApiException(error: ApiException): MappedError {
  const base = fail(error.code, error.message, error.fields)
  const body = error.details === undefined ? base : { ...base, error: { ...base.error!, details: error.details } }
  return { status: error.status, body }
}

function fromPrisma(error: Prisma.PrismaClientKnownRequestError): MappedError | null {
  switch (error.code) {
    case PRISMA_UNIQUE_VIOLATION:
      return { status: 409, body: fail('CONFLICT', 'A record with these values already exists') }
    case PRISMA_FOREIGN_KEY_VIOLATION:
      return { status: 409, body: fail('CONFLICT', REFERENCED_MESSAGE) }
    case PRISMA_RECORD_NOT_FOUND:
      return { status: 404, body: fail('NOT_FOUND', 'Record not found') }
    default:
      return null
  }
}

/** Turns anything a handler can throw into the HTTP status and error envelope the API promises. */
export function mapError(error: unknown): MappedError {
  if (error instanceof ApiException) return fromApiException(error)
  if (error instanceof ZodError) {
    return { status: 400, body: fail('VALIDATION', 'Some fields need attention', zodFields(error)) }
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = fromPrisma(error)
    if (mapped) return mapped
  }
  logError(error instanceof Error ? error.message : String(error), error instanceof Error ? error.stack : undefined)
  return { status: 500, body: fail('INTERNAL', INTERNAL_MESSAGE) }
}
