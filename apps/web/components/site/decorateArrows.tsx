import { Fragment, type ReactNode } from 'react'

const ARROW = /([←→↗])/

/**
 * Wraps the decorative arrow glyphs in a string label ("All news →", "← Artists", "Instagram ↗") in
 * `aria-hidden` spans so screen readers announce only the words. Inline spans: rendering is unchanged.
 */
export function decorateArrows(label: ReactNode): ReactNode {
  if (typeof label !== 'string' || !ARROW.test(label)) return label
  return label.split(ARROW).map((part, index) =>
    ARROW.test(part) ? (
      <span key={index} aria-hidden="true">
        {part}
      </span>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  )
}
