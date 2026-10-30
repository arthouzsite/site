import type { ReactNode } from 'react'

type Props = {
  title: ReactNode
  /** Optional trailing link, e.g. <TextLink>All exhibitions →</TextLink>. */
  action?: ReactNode
  /** Heading level for the title; defaults to h2. */
  as?: 'h2' | 'h3' | 'div'
  className?: string
}

/** Section heading on a 1 px ink rule: uppercase title left, optional action right (prototype home sections). */
export function SectionRule({ title, action, as: Heading = 'h2', className = 'mb-10' }: Props) {
  return (
    <div className={`flex flex-wrap items-baseline justify-between gap-4 border-t border-ink pt-[18px] ${className}`}>
      <Heading className="m-0 text-[12.5px] font-medium tracking-[0.18em] uppercase">{title}</Heading>
      {action}
    </div>
  )
}
