import { useId, type ReactNode } from 'react'
import { cx } from '../../components/ui/cx'

type Props = { title: string; count?: number; actions?: ReactNode; danger?: boolean; children: ReactNode; className?: string }

export function FormCard({ title, count, actions, danger, children, className }: Props) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={cx('border bg-surface', danger ? 'border-danger' : 'border-line', className)}>
      <div className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-5 py-2">
        <h2 id={id} className={cx('m-0 font-display text-18 font-normal', danger && 'text-danger')}>{title}</h2>
        {count !== undefined && <span className="text-12 text-muted">{count}</span>}
        {actions && <div className="ml-auto flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div className="flex flex-col gap-4 p-5">{children}</div>
    </section>
  )
}
