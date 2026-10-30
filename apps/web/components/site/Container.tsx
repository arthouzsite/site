import type { ReactNode } from 'react'

type Props = { children: ReactNode; className?: string }

/** The prototype's page column: max-width 1440 centred, fluid side gutters. */
export function Container({ children, className = '' }: Props) {
  return <div className={`mx-auto max-w-[1440px] px-[clamp(20px,4vw,56px)] ${className}`}>{children}</div>
}
