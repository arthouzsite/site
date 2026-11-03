import Link from 'next/link'
import type { ReactNode } from 'react'

type Props = { href: string; children: ReactNode; className?: string }

/** "← Section" link at the top of a detail page, in the rust accent so it reads as a way back rather than as a caption. */
export function BackLink({ href, children, className = '' }: Props) {
  return (
    <Link href={href} className={`hit-44 inline-flex items-center gap-2 text-[12.5px] tracking-[0.16em] text-rust uppercase hover:text-ink ${className}`}>
      <span aria-hidden="true">←</span>
      {children}
    </Link>
  )
}
