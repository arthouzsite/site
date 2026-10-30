import { useId, type ReactNode } from 'react'
import { cx } from './cx'

type Props = {
  title: string
  /** Right-aligned content in the header, such as a link. */
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

/** Titled surface; the region is named by its heading. */
export function Card({ title, actions, children, className, bodyClassName }: Props) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className={cx('border border-line bg-surface', className)}>
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
        <h2 id={headingId} className="m-0 text-12 font-medium uppercase tracking-eyebrow">{title}</h2>
        {actions}
      </div>
      <div className={cx('flex flex-col gap-[18px] p-5', bodyClassName)}>{children}</div>
    </section>
  )
}
