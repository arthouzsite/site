import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { parseBody, parseQuery, queryRecord } from './parse'

const post = (body: BodyInit | null, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/x', { method: 'POST', body, headers: { 'content-type': 'application/json', ...headers } })

const schema = z.object({ name: z.string().min(1) })

describe('parseBody', () => {
  it('returns the parsed value for a valid JSON object', async () => {
    await expect(parseBody(post('{"name":"Ada"}'), schema)).resolves.toEqual({ name: 'Ada' })
  })

  it('maps a non-JSON body to 400 BAD_REQUEST', async () => {
    await expect(parseBody(post('not json'), schema)).rejects.toMatchObject({
      status: 400,
      code: 'BAD_REQUEST',
      message: 'Body must be a JSON object',
    })
  })

  it('maps an empty body to 400 BAD_REQUEST', async () => {
    await expect(parseBody(post(null), schema)).rejects.toMatchObject({ status: 400, code: 'BAD_REQUEST' })
  })

  it.each(['[1,2]', '"text"', '42', 'null', 'true'])('maps the non-object JSON body %s to 400 BAD_REQUEST', async (raw) => {
    await expect(parseBody(post(raw), schema)).rejects.toMatchObject({ status: 400, code: 'BAD_REQUEST' })
  })

  it('lets schema failures surface as a ZodError for the error mapper', async () => {
    await expect(parseBody(post('{"name":""}'), schema)).rejects.toBeInstanceOf(z.ZodError)
  })
})

describe('queryRecord / parseQuery', () => {
  it('flattens search params into a record, last value winning', () => {
    expect(queryRecord(new URL('http://localhost/api/x?a=1&b=two&a=3'))).toEqual({ a: '3', b: 'two' })
  })

  it('parses and coerces through the schema', () => {
    const query = z.object({ page: z.coerce.number().int().default(1) })
    expect(parseQuery(new URL('http://localhost/api/x?page=4'), query)).toEqual({ page: 4 })
    expect(parseQuery(new URL('http://localhost/api/x'), query)).toEqual({ page: 1 })
  })

  it('throws a ZodError for an invalid query', () => {
    expect(() => parseQuery(new URL('http://localhost/api/x?page=abc'), z.object({ page: z.coerce.number().int() }))).toThrow(z.ZodError)
  })
})
