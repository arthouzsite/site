import { ArgumentsHost, BadRequestException, ForbiddenException, Logger, NotFoundException } from '@nestjs/common'
import { z } from 'zod'
import { Prisma } from '../generated/prisma/client'
import { HttpExceptionFilter } from './http-exception.filter'

type Captured = { status: number; body: unknown }

function run(exception: unknown): Captured {
  const captured: Captured = { status: 0, body: undefined }
  const response = {
    status(code: number) {
      captured.status = code
      return this
    },
    json(body: unknown) {
      captured.body = body
      return this
    },
  }
  const host = { switchToHttp: () => ({ getResponse: () => response }) } as unknown as ArgumentsHost
  new HttpExceptionFilter().catch(exception, host)
  return captured
}

function prismaError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('db failure', { code, clientVersion: 'test' })
}

describe('HttpExceptionFilter', () => {
  it('maps ZodError to 400 VALIDATION with the first message per path', () => {
    const schema = z.object({ title: z.string().min(1), nested: z.object({ n: z.number() }) })
    const result = schema.safeParse({ title: '', nested: { n: 'x' } })
    if (result.success) throw new Error('expected failure')

    const { status, body } = run(result.error)

    expect(status).toBe(400)
    expect(body).toMatchObject({ ok: false, data: null, error: { code: 'VALIDATION' } })
    const fields = (body as { error: { fields: Record<string, string> } }).error.fields
    expect(Object.keys(fields).sort()).toEqual(['nested.n', 'title'])
    expect(typeof fields.title).toBe('string')
  })

  it('maps Prisma P2002 to 409 CONFLICT', () => {
    const { status, body } = run(prismaError('P2002'))
    expect(status).toBe(409)
    expect(body).toMatchObject({ ok: false, error: { code: 'CONFLICT' } })
  })

  it('maps Prisma P2003 to 409 CONFLICT with the referenced message', () => {
    const { status, body } = run(prismaError('P2003'))
    expect(status).toBe(409)
    expect(body).toEqual({
      ok: false,
      data: null,
      error: { code: 'CONFLICT', message: 'Record is referenced by other content' },
    })
  })

  it('maps Prisma P2025 to 404 NOT_FOUND', () => {
    const { status, body } = run(prismaError('P2025'))
    expect(status).toBe(404)
    expect(body).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } })
  })

  it('maps NotFoundException to 404 NOT_FOUND', () => {
    const { status, body } = run(new NotFoundException('Nothing here'))
    expect(status).toBe(404)
    expect(body).toEqual({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Nothing here' } })
  })

  it('keeps the status of other HttpExceptions and joins message arrays', () => {
    const forbidden = run(new ForbiddenException('No access'))
    expect(forbidden.status).toBe(403)
    expect(forbidden.body).toMatchObject({ error: { code: 'FORBIDDEN', message: 'No access' } })

    const bad = run(new BadRequestException({ message: ['a is wrong', 'b is wrong'] }))
    expect(bad.status).toBe(400)
    expect(bad.body).toMatchObject({ error: { code: 'BAD_REQUEST', message: 'a is wrong, b is wrong' } })
  })

  it('maps unknown Prisma codes and arbitrary errors to 500 INTERNAL without leaking the message, and logs them', () => {
    const logSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    try {
      const unknownPrisma = run(prismaError('P9999'))
      const generic = run(new Error('secret connection string'))

      expect(unknownPrisma.status).toBe(500)
      expect(generic.status).toBe(500)
      expect(generic.body).toEqual({ ok: false, data: null, error: { code: 'INTERNAL', message: 'Something went wrong' } })
      expect(JSON.stringify(generic.body)).not.toContain('secret connection string')
      expect(logSpy).toHaveBeenCalledWith('secret connection string', expect.any(String))
    } finally {
      logSpy.mockRestore()
    }
  })

  it('logs non-Error throwables as strings', () => {
    const logSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    try {
      expect(run('boom').status).toBe(500)
      expect(logSpy).toHaveBeenCalledWith('boom', undefined)
    } finally {
      logSpy.mockRestore()
    }
  })
})
