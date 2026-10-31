import { forwardRef, type SelectHTMLAttributes } from 'react'
import { CONTROL } from './Input'
import { cx } from './cx'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, ...rest },
  ref,
) {
  return <select ref={ref} className={cx(CONTROL, 'select-chevron pr-8 text-13', className)} {...rest} />
})
