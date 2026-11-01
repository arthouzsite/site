/** A single HTTP byte range as requested: `start-end`, `start-` or the last `suffix` bytes. */
export type RangeRequest = { readonly start: number; readonly end?: number } | { readonly suffix: number }
export type ResolvedRange = { readonly start: number; readonly end: number; readonly total: number }

const RANGE_PATTERN = /^bytes=(\d*)-(\d*)$/

/** Parses a `Range` header; undefined (serve the whole object) when absent, malformed, in another unit or asking for several ranges. */
export function parseRangeHeader(header: string | null): RangeRequest | undefined {
  const match = header ? RANGE_PATTERN.exec(header.trim()) : null
  if (!match) return undefined
  const [, first = '', last = ''] = match
  if (first === '') {
    const suffix = Number(last)
    return last !== '' && suffix > 0 ? { suffix } : undefined
  }
  const start = Number(first)
  if (last === '') return { start }
  const end = Number(last)
  return end >= start ? { start, end } : undefined
}

/** Inclusive byte positions inside an object of `total` bytes, or null when no byte of it is covered. */
export function resolveRange(range: RangeRequest, total: number): ResolvedRange | null {
  if (total <= 0) return null
  if ('suffix' in range) return { start: Math.max(0, total - range.suffix), end: total - 1, total }
  if (range.start >= total) return null
  return { start: range.start, end: Math.min(range.end ?? total - 1, total - 1), total }
}
