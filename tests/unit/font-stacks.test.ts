import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const TOKENS = readFileSync(fileURLToPath(new URL('../../styles/tokens.css', import.meta.url)), 'utf8')

function stack(name: string): string {
  const match = TOKENS.match(new RegExp(`--font-${name}:\\s*([^;]+);`))
  if (!match?.[1]) throw new Error(`--font-${name} not found in tokens.css`)
  return match[1].trim()
}

describe('font stacks', () => {
  // next/font's variables append a size-adjusted "… Fallback" face, which renders glyphs outside the
  // subset (→ ↗) wider than the prototype's plain generic fallback.
  it('name the loaded faces directly, without next/font fallback variables', () => {
    expect(stack('ui')).toBe("'Space Grotesk', 'Noto Sans Tamil', sans-serif")
    // The site sets headings in the navigation's face too (FIN-3781).
    expect(stack('display')).toBe("'Space Grotesk', 'Noto Sans Tamil', sans-serif")
    expect(stack('display-tamil')).toBe("'Space Grotesk', 'Noto Serif Tamil', sans-serif")
    expect(TOKENS).not.toMatch(/var\(--font-(space-grotesk|eb-garamond|noto-serif-tamil)\)/)
  })
})
