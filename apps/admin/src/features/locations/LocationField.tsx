import { cloneElement, type ReactElement } from 'react'
import { Icon, fieldId } from '../../components/ui'

type Props = {
  /** Form field name; kept as the control's `name` so react-hook-form stays wired. */
  name: string
  /** Namespaces the DOM id so several cards can share one page. */
  idPrefix: string
  label: string
  required?: boolean
  help?: string
  error?: string
  children: ReactElement<Record<string, unknown>>
}

/** `Field` derives the control name from its id; cards need distinct ids but real form names, hence this variant. */
export function LocationField({ name, idPrefix, label, required, help, error, children }: Props) {
  const id = fieldId(`${idPrefix}-${name}`)
  const describedBy = [help ? `${id}-help` : null, error ? `${id}-err` : null].filter(Boolean).join(' ') || undefined
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-12 font-medium tracking-label text-body">
        {label}
        {required && <span className="ml-0.5 text-rust" aria-hidden="true">*</span>}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {cloneElement(children, { id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined, 'aria-required': required ? true : undefined })}
      {help && <p id={`${id}-help`} className="m-0 text-12 text-muted">{help}</p>}
      {error && (
        <p id={`${id}-err`} className="m-0 flex items-center gap-1.5 text-12 text-danger"><Icon name="alert" />{error}</p>
      )}
    </div>
  )
}
