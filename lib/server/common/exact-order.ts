import { badRequest } from '@/lib/server/http/errors'

const INVALID_ORDER = 'INVALID_ORDER'

// A reorder request must list every existing id exactly once.
export function assertExactOrder(requested: string[], existing: string[], noun: string): void {
  const expected = new Set(existing)
  const isExactSet =
    requested.length === expected.size && new Set(requested).size === requested.length && requested.every((id) => expected.has(id))
  if (!isExactSet) {
    throw badRequest(INVALID_ORDER, `ids must list every ${noun} exactly once`)
  }
}
