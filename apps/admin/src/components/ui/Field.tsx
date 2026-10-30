import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { Icon } from './Icon'
import { cx } from './cx'

type Props = {
  name: string
  label: string
  required?: boolean
  help?: string
  error?: string
  className?: string
  children: ReactElement<Record<string, unknown>> | ReactNode
}

export function fieldId(name: string): string {
  return `field-${name}`
}

export function Field({ name, label, required, help, error, className, children }: Props) {
  const id = fieldId(name)
  const describedBy = [help ? `${id}-help` : null, error ? `${id}-err` : null].filter(Boolean).join(' ') || undefined
  const control = isValidElement<Record<string, unknown>>(children)
    ? cloneElement(children, {
        id,
        name,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        'aria-required': required ? true : undefined,
      })
    : children
  return (
    <div className={cx('flex min-w-0 flex-col gap-1.5', className)} data-invalid={error ? '' : undefined}>
      <label htmlFor={id} className="text-12 font-medium tracking-label text-body">
        {label}
        {required && <span className="ml-0.5 text-rust" aria-hidden="true">*</span>}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {control}
      {help && <p id={`${id}-help`} className="m-0 text-12 text-muted">{help}</p>}
      {error && (
        <p id={`${id}-err`} className="m-0 flex items-center gap-1.5 text-12 text-danger">
          <Icon name="alert" />
          {error}
        </p>
      )}
    </div>
  )
}
