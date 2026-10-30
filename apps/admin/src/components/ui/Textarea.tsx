import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { CONTROL } from './Input'
import { cx } from './cx'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, rows = 4, ...rest },
  ref,
) {
  return <textarea ref={ref} rows={rows} className={cx(CONTROL, 'h-auto min-h-28 resize-y py-2.5 leading-[1.55]', className)} {...rest} />
})
