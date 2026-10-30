import { describe, expect, it } from 'vitest'
import { formatBytes, formatDate, initials } from './format'

describe('format', () => {
  it('formats dates in Asia/Kolkata and rejects invalid ones', () => {
    expect(formatDate('2026-10-30T00:00:00.000Z')).toBe('30 Oct 2026')
    expect(formatDate('nope')).toBe('')
  })
  it('derives initials', () => {
    expect(initials('Priya Raman')).toBe('PR')
    expect(initials('priya')).toBe('P')
    expect(initials('  ')).toBe('?')
  })
  it('formats byte sizes', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2 KB')
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MB')
  })
})
