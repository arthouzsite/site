import { forwardRef, type InputHTMLAttributes } from 'react'
import { cx } from './cx'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: string }

/** Native checkbox with switch role so it stays form-compatible; the label doubles as the 44px hit area. */
export const Switch = forwardRef<HTMLInputElement, Props>(function Switch({ label, className, ...rest }, ref) {
  return (
    <label className={cx('inline-flex min-h-11 min-w-11 cursor-pointer items-center gap-3 text-14', className)}>
      <input ref={ref} type="checkbox" role="switch" className="switch-input" {...rest} />
      <span>{label}</span>
    </label>
  )
})
