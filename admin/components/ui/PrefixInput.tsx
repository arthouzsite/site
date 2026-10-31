import { forwardRef, type InputHTMLAttributes } from 'react'
import { cx } from './cx'

type Props = InputHTMLAttributes<HTMLInputElement> & { prefix: string }

/** Input with a fixed, non-editable prefix (e.g. a URL base); props flow to the input so `Field` can wire it. */
export const PrefixInput = forwardRef<HTMLInputElement, Props>(function PrefixInput({ prefix, className, ...rest }, ref) {
  return (
    <div className="flex h-11 w-full min-w-0 items-stretch rounded-xs border border-line-strong bg-surface-2 focus-within:border-ink hover:border-ink has-[[aria-invalid=true]]:border-danger">
      <span className="grid shrink-0 place-items-center border-r border-line px-3 text-13 text-muted" aria-hidden="true">{prefix}</span>
      <input ref={ref} className={cx('min-w-0 flex-1 bg-transparent px-3 text-14 text-ink placeholder:text-faint', className)} {...rest} />
    </div>
  )
})
