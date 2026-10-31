import Link from 'next/link'
import type { ReactNode } from 'react'

type Props = {
  href: string
  children: ReactNode
  /** Opens in a new tab with rel="noopener noreferrer" (e.g. Directions ↗). */
  external?: boolean
  className?: string
}

const BASE =
  'flex items-center gap-3 self-start bg-ink px-6 py-4 text-[12.5px] tracking-[0.16em] text-paper uppercase hover:bg-amber hover:text-ink'

/** Solid ink call-to-action; amber with ink text on hover (prototype "View exhibition →"). */
export function PrimaryButton({ href, children, external = false, className = '' }: Props) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={`${BASE} ${className}`}>
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={`${BASE} ${className}`}>
      {children}
    </Link>
  )
}
