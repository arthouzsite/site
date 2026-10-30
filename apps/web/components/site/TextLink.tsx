import Link from 'next/link'
import type { ReactNode } from 'react'

type Props = {
  href: string
  children: ReactNode
  /** Adds the 1 px currentColor underline with 4 px gap ("View artist →"). */
  underline?: boolean
  external?: boolean
  className?: string
}

/** Uppercase 12.5 px link; rust on hover via the base `a:hover` rule. */
export function TextLink({ href, children, underline = false, external = false, className = '' }: Props) {
  const classes = `text-[12.5px] tracking-[0.16em] uppercase ${underline ? 'border-b border-current pb-1' : ''} ${className}`
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  )
}
