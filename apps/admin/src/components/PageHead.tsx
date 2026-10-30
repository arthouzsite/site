import type { ReactNode } from 'react'

type Props = { title: string; subtitle?: string; actions?: ReactNode }

export function PageHead({ title, subtitle, actions }: Props) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div>
        <h1 className="m-0 font-display text-32 font-normal leading-none tracking-[-0.01em] sm:text-40">{title}</h1>
        {subtitle && <p className="mb-0 mt-2 text-13 text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
