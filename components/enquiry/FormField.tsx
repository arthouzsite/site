import type { ReactNode } from 'react'
import { ERROR_CLASS, LABEL_CLASS } from './fieldStyles'

export type ControlProps = { id: string; 'aria-invalid': true | undefined; 'aria-describedby': string | undefined }

type Props = {
  name: string
  label: string
  error?: string
  optional?: boolean
  className?: string
  /** Receives the id and aria wiring the control must spread so the label and error stay associated. */
  children: (props: ControlProps) => ReactNode
}

const ID_PREFIX = 'enquiry'
export const fieldId = (name: string): string => `${ID_PREFIX}-${name}`

/** A label above a control, with the field's inline error below it. */
export function FormField({ name, label, error, optional = false, className = '', children }: Props) {
  const id = fieldId(name)
  const errorId = `${id}-error`
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
        {optional && <span className="ml-2 normal-case tracking-normal text-muted">Optional</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? errorId : undefined })}
      {error && (
        <p id={errorId} className={ERROR_CLASS}>
          {error}
        </p>
      )}
    </div>
  )
}
