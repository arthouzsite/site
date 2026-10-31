import type { Page } from '@playwright/test'

export const MIN_HIT_PX = 44

export type SmallTarget = { selector: string; text: string; width: number; height: number }

/**
 * Lists every visible `a` / `button` inside `header`, `main` and `footer` whose effective hit box is under
 * `min` px on either axis. The effective box is the larger of the element's own border box and its
 * absolutely positioned `::before` box (the `hit-44` utility, counted only on a positioned host), measured per axis.
 */
export function findSmallTargets(page: Page, min = MIN_HIT_PX): Promise<SmallTarget[]> {
  return page.evaluate((minPx) => {
    const describe = (el: Element): string => {
      const parts: string[] = []
      for (let node: Element | null = el; node && parts.length < 4; node = node.parentElement) {
        parts.unshift(node.tagName.toLowerCase() + (node.id ? `#${node.id}` : ''))
      }
      return parts.join(' > ')
    }
    const pseudoBox = (el: Element): { width: number; height: number } => {
      // A statically positioned host would size an absolute ::before against some ancestor, not itself.
      if (getComputedStyle(el).position === 'static') return { width: 0, height: 0 }
      const style = getComputedStyle(el, '::before')
      if (style.content === 'none' || style.content === 'normal' || style.position !== 'absolute') return { width: 0, height: 0 }
      return { width: parseFloat(style.width) || 0, height: parseFloat(style.height) || 0 }
    }
    const controls = Array.from(document.querySelectorAll('header a, header button, main a, main button, footer a, footer button'))
    return controls.flatMap((el) => {
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) return []
      if (getComputedStyle(el).visibility === 'hidden') return []
      const before = pseudoBox(el)
      const width = Math.max(rect.width, before.width)
      const height = Math.max(rect.height, before.height)
      // Sub-pixel tolerance: `max(100%, 44px)` can resolve to 43.99… after layout rounding.
      if (width >= minPx - 0.01 && height >= minPx - 0.01) return []
      return [{ selector: describe(el), text: (el.textContent ?? '').trim().slice(0, 40), width: Math.round(width * 100) / 100, height: Math.round(height * 100) / 100 }]
    })
  }, min)
}
