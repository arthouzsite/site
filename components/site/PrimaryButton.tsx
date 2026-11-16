import Link from 'next/link'
import type { ReactNode } from 'react'

type Props = {
  href: string
  children: ReactNode
  /** Opens in a new tab with rel="noopener noreferrer" (e.g. Directions ↗). */
  external?: boolean
  className?: string
}

export const PRIMARY_BUTTON_CLASS =
  'flex items-center gap-3 self-start bg-ink px-6 py-4 text-[12.5px] tracking-[0.16em] text-paper uppercase hover:bg-amber hover:text-ink'

/**
 * Extra rules for a real `<button>` to render exactly like the link above: the site has no CSS reset, so the
 * browser's button defaults (own font, border, margin, pointer) must be cancelled one by one.
 */
export const PRIMARY_BUTTON_ELEMENT_CLASS =
  'm-0 cursor-pointer appearance-none rounded-none border-0 [font-family:inherit] [line-height:inherit] text-left'

/** Solid ink call-to-action; amber with ink text on hover (prototype "View exhibition →"). */
export function PrimaryButton({ href, children, external = false, className = '' }: Props) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={`${PRIMARY_BUTTON_CLASS} ${className}`}>
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={`${PRIMARY_BUTTON_CLASS} ${className}`}>
      {children}
    </Link>
  )
}
