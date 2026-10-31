import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { Prisma } from '@/lib/server/generated/prisma/client'
import { logError } from '@/lib/server/log'
import {
  ApiException,
  badRequest,
  conflict,
  forbidden,
  mapError,
  notFound,
  payloadTooLarge,
  tooManyRequests,
  unauthorized,
  unsupportedMediaType,
} from './errors'

vi.mock('@/lib/server/log', () => ({ logError: vi.fn() }))

function prismaError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('db failure', { code, clientVersion: 'test' })
}

describe('ApiException factories', () => {
  it('carry the status, code and message of the old Nest exceptions', () => {
    expect(badRequest('X', 'bad')).toMatchObject({ status: 400, code: 'X', message: 'bad' })
    expect(unauthorized()).toMatchObject({ status: 401, code: 'UNAUTHORIZED', message: 'Please sign in again' })
    expect(forbidden('No access')).toMatchObject({ status: 403, code: 'FORBIDDEN', message: 'No access' })
    expect(forbidden('Wrong origin', 'BAD_ORIGIN')).toMatchObject({ status: 403, code: 'BAD_ORIGIN' })
    expect(notFound()).toMatchObject({ status: 404, code: 'NOT_FOUND', message: 'Record not found' })
    expect(conflict('IN_USE', 'in use', { a: 1 })).toMatchObject({ status: 409, code: 'IN_USE', details: { a: 1 } })
    expect(tooManyRequests('RATE_LIMITED', 'slow down')).toMatchObject({ status: 429, code: 'RATE_LIMITED' })
    expect(payloadTooLarge('big')).toMatchObject({ status: 413, code: 'PAYLOAD_TOO_LARGE' })
    expect(unsupportedMediaType('odd')).toMatchObject({ status: 415, code: 'UNSUPPORTED_MEDIA_TYPE' })
    expect(notFound()).toBeInstanceOf(ApiException)
    expect(notFound()).toBeInstanceOf(Error)
  })
})

describe('mapError', () => {
  it('uses a custom string code from the exception', () => {
    const result = mapError(badRequest('CANNOT_DELETE_SELF', 'Nope'))
    expect(result.status).toBe(400)
    expect(result.body).toMatchObject({ ok: false, error: { code: 'CANNOT_DELETE_SELF', message: 'Nope' } })
  })

  it('maps ZodError to 400 VALIDATION with the first message per path', () => {
    const schema = z.object({ title: z.string().min(1), nested: z.object({ n: z.number() }) })
    const result = schema.safeParse({ title: '', nested: { n: 'x' } })
    if (result.success) throw new Error('expected failure')

    const { status, body } = mapError(result.error)

    expect(status).toBe(400)
    expect(body).toMatchObject({ ok: false, data: null, error: { code: 'VALIDATION' } })
    const fields = (body.error as { fields: Record<string, string> }).fields
    expect(Object.keys(fields).sort()).toEqual(['nested.n', 'title'])
    expect(typeof fields.title).toBe('string')
  })

  it('maps Prisma P2002 to 409 CONFLICT', () => {
    const { status, body } = mapError(prismaError('P2002'))
    expect(status).toBe(409)
    expect(body).toMatchObject({ ok: false, error: { code: 'CONFLICT' } })
  })

  it('maps Prisma P2003 to 409 CONFLICT with the referenced message', () => {
    const { status, body } = mapError(prismaError('P2003'))
    expect(status).toBe(409)
    expect(body).toEqual({
      ok: false,
      data: null,
      error: { code: 'CONFLICT', message: 'Record is referenced by other content' },
    })
  })

  it('maps Prisma P2025 to 404 NOT_FOUND', () => {
    const { status, body } = mapError(prismaError('P2025'))
    expect(status).toBe(404)
    expect(body).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } })
  })

  it('maps a NotFound exception to 404 NOT_FOUND', () => {
    const { status, body } = mapError(notFound('Nothing here'))
    expect(status).toBe(404)
    expect(body).toEqual({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Nothing here' } })
  })

  it('keeps the status of other exceptions', () => {
    const result = mapError(forbidden('No access'))
    expect(result.status).toBe(403)
    expect(result.body).toMatchObject({ error: { code: 'FORBIDDEN', message: 'No access' } })
  })

  it('passes through fields from an ApiException', () => {
    const { body } = mapError(new ApiException(400, 'VALIDATION', 'Some fields need attention', { title: 'Required' }))
    expect(body.error).toEqual({ code: 'VALIDATION', message: 'Some fields need attention', fields: { title: 'Required' } })
  })

  it('passes through code and details from a conflict', () => {
    const { status, body } = mapError(conflict('MEDIA_IN_USE', 'in use', { usedBy: [] }))
    expect(status).toBe(409)
    expect(body).toEqual({
      ok: false,
      data: null,
      error: { code: 'MEDIA_IN_USE', message: 'in use', details: { usedBy: [] } },
    })
  })

  it('maps unknown Prisma codes and arbitrary errors to 500 INTERNAL without leaking the message, and logs them', () => {
    const unknownPrisma = mapError(prismaError('P9999'))
    const generic = mapError(new Error('secret connection string'))

    expect(unknownPrisma.status).toBe(500)
    expect(generic.status).toBe(500)
    expect(generic.body).toEqual({ ok: false, data: null, error: { code: 'INTERNAL', message: 'Something went wrong' } })
    expect(JSON.stringify(generic.body)).not.toContain('secret connection string')
    expect(logError).toHaveBeenCalledWith('secret connection string', expect.any(String))
  })

  it('logs non-Error throwables as strings', () => {
    expect(mapError('boom').status).toBe(500)
    expect(logError).toHaveBeenCalledWith('boom', undefined)
  })
})
