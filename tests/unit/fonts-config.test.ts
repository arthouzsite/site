import { describe, expect, it, vi } from 'vitest'

vi.mock('next/font/google', () => {
  const family = (variable: string) => () => ({ variable, className: variable })
  return {
    EB_Garamond: family('--font-eb-garamond'),
    Space_Grotesk: family('--font-space-grotesk'),
    Noto_Serif_Tamil: family('--font-noto-serif-tamil'),
  }
})

import { fontVariables } from '@/app/fonts'

describe('font registration', () => {
  it('joins every family variable for the html element', () => {
    expect(fontVariables.split(' ')).toEqual(['--font-eb-garamond', '--font-space-grotesk', '--font-noto-serif-tamil'])
  })
})
