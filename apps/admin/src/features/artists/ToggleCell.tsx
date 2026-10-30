import type { InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'aria-label'> & { label: string }

/** Switch for table cells: the label is the accessible name only, and the wrapper gives a 44px hit area. */
export function ToggleCell({ label, ...rest }: Props) {
  return (
    <label className="hit-area">
      <input type="checkbox" role="switch" aria-label={label} className="switch-input" {...rest} />
    </label>
  )
}
