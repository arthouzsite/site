import { describe, expect, it } from 'vitest'
import { heroStatusLabel, telHref } from '@/lib/format'

describe('telHref', () => {
  it('adds the tel: scheme to a bare +E.164 number as the admin stores it', () => {
    expect(telHref('+914400000000')).toBe('tel:+914400000000')
  })

  it('keeps exactly one tel: prefix when the seed already has it', () => {
    expect(telHref('tel:+914400000000')).toBe('tel:+914400000000')
    expect(telHref('TEL:+914400000000')).toBe('tel:+914400000000')
    expect(telHref('tel:tel:+914400000000')).toBe('tel:+914400000000')
  })

  it('trims surrounding whitespace', () => {
    expect(telHref('  +914400000000 ')).toBe('tel:+914400000000')
    expect(telHref(' tel:+914400000000 ')).toBe('tel:+914400000000')
  })
})

describe('heroStatusLabel', () => {
  it('uses the literal for a current exhibition', () => {
    expect(heroStatusLabel({ status: 'CURRENT', statusLabel: 'Whatever' })).toBe('Now on view')
  })

  it('uses the API status label otherwise', () => {
    expect(heroStatusLabel({ status: 'UPCOMING', statusLabel: 'Opens 3 Dec' })).toBe('Opens 3 Dec')
    expect(heroStatusLabel({ status: 'PAST', statusLabel: 'Past' })).toBe('Past')
  })
})
