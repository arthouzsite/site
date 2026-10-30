import { forwardRef, type InputHTMLAttributes } from 'react'
import { cx } from './cx'

export const CONTROL =
  'h-11 w-full rounded-xs border border-line-strong bg-surface-2 px-3 text-14 text-ink transition-colors placeholder:text-faint hover:border-ink focus:border-ink aria-[invalid=true]:border-danger'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cx(CONTROL, className)} {...rest} />
})
