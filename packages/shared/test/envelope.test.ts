import { expect, test } from 'vitest'
import { fail, ok } from '../src/index'

test('ok wraps data and meta', () => {
  expect(ok({ a: 1 })).toEqual({ ok: true, data: { a: 1 }, error: null })
  expect(ok([1], { total: 1, page: 1, limit: 10 }).meta).toEqual({ total: 1, page: 1, limit: 10 })
})
test('fail wraps error with optional fields', () => {
  expect(fail('X', 'bad')).toEqual({ ok: false, data: null, error: { code: 'X', message: 'bad' } })
  expect(fail('X', 'bad', { a: 'req' }).error?.fields).toEqual({ a: 'req' })
})
