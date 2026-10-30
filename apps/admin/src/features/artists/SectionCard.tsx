import { useId, type ReactNode } from 'react'
import { cx } from '../../components/ui/cx'

type Props = { title: string; note?: ReactNode; children: ReactNode; className?: string }

export function SectionCard({ title, note, children, className }: Props) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={cx('border border-line bg-surface', className)}>
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
        <h2 id={id} className="m-0 text-12 font-medium uppercase tracking-eyebrow">{title}</h2>
        {note && <span className="text-12 text-muted">{note}</span>}
      </div>
      <div className="flex flex-col gap-4.5 p-5">{children}</div>
    </section>
  )
}
