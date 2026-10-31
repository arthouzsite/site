import { describe, expect, it } from 'vitest'
import { requireActor } from './actor'

describe('requireActor', () => {
  it('returns the signed-in user', () => {
    const user = { id: 'u1', email: 'a@example.test', name: 'A', role: 'ADMIN' as const }
    expect(requireActor(user)).toBe(user)
  })

  it('throws 401 when there is no user', () => {
    expect(() => requireActor(null)).toThrowError(expect.objectContaining({ status: 401 }))
  })
})
