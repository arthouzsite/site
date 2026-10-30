import { forwardRef, type InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'aria-label'> & { label: string }

/** Label-less switch for table rows; the label becomes the accessible name and the wrapper is the 44px hit area. */
export const RowSwitch = forwardRef<HTMLInputElement, Props>(function RowSwitch({ label, ...rest }, ref) {
  return (
    <label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center">
      <input ref={ref} type="checkbox" role="switch" aria-label={label} className="switch-input" {...rest} />
    </label>
  )
})
