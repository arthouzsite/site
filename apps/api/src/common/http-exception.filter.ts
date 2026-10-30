import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { fail } from '@arthouz/shared'
import type { Response } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '../generated/prisma/client'

const PRISMA_UNIQUE_VIOLATION = 'P2002'
const PRISMA_RECORD_NOT_FOUND = 'P2025'
const PRISMA_FOREIGN_KEY_VIOLATION = 'P2003'
const REFERENCED_MESSAGE = 'Record is referenced by other content'
const INTERNAL_MESSAGE = 'Something went wrong'

const CODE_BY_STATUS: Readonly<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'PAYLOAD_TOO_LARGE',
  [HttpStatus.UNSUPPORTED_MEDIA_TYPE]: 'UNSUPPORTED_MEDIA_TYPE',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
}

type ErrorBody = ReturnType<typeof fail> | (Omit<ReturnType<typeof fail>, 'error'> & { error: Record<string, unknown> })
type Mapped = { status: number; body: ErrorBody }

export function zodFields(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) {
    const path = issue.path.join('.')
    if (!(path in fields)) fields[path] = issue.message
  }
  return fields
}

function httpExceptionMessage(exception: HttpException): string {
  const response = exception.getResponse()
  if (typeof response === 'object' && response !== null && 'message' in response) {
    const { message } = response as { message: unknown }
    return Array.isArray(message) ? message.join(', ') : String(message)
  }
  return exception.message
}

function httpExceptionCode(exception: HttpException): string | undefined {
  const response = exception.getResponse()
  if (typeof response === 'object' && response !== null && 'code' in response) {
    const { code } = response as { code: unknown }
    return typeof code === 'string' ? code : undefined
  }
  return undefined
}

function httpExceptionDetails(exception: HttpException): Record<string, unknown> | undefined {
  const response = exception.getResponse()
  if (typeof response === 'object' && response !== null && 'details' in response) {
    const { details } = response as { details: unknown }
    return typeof details === 'object' && details !== null ? (details as Record<string, unknown>) : undefined
  }
  return undefined
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>()
    const { status, body } = this.map(exception)
    response.status(status).json(body)
  }

  private map(exception: unknown): Mapped {
    if (exception instanceof ZodError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        body: fail('VALIDATION', 'Some fields need attention', zodFields(exception)),
      }
    }
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === PRISMA_UNIQUE_VIOLATION) {
        return { status: HttpStatus.CONFLICT, body: fail('CONFLICT', 'A record with these values already exists') }
      }
      if (exception.code === PRISMA_FOREIGN_KEY_VIOLATION) {
        return { status: HttpStatus.CONFLICT, body: fail('CONFLICT', REFERENCED_MESSAGE) }
      }
      if (exception.code === PRISMA_RECORD_NOT_FOUND) {
        return { status: HttpStatus.NOT_FOUND, body: fail('NOT_FOUND', 'Record not found') }
      }
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const code = httpExceptionCode(exception) ?? CODE_BY_STATUS[status] ?? 'ERROR'
      const base = fail(code, httpExceptionMessage(exception))
      const details = httpExceptionDetails(exception)
      return { status, body: details ? { ...base, error: { ...base.error!, details } } : base }
    }
    this.logger.error(
      exception instanceof Error ? exception.message : String(exception),
      exception instanceof Error ? exception.stack : undefined,
    )
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, body: fail('INTERNAL', INTERNAL_MESSAGE) }
  }
}
