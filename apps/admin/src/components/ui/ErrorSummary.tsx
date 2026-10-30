import { useEffect, useRef } from 'react'
import { fieldId } from './Field'

export type SummaryError = { name: string; message: string }

/** `focusKey` (e.g. a submit count) re-focuses the summary when the same errors are shown again. */
export function ErrorSummary({ errors, focusKey }: { errors: SummaryError[]; focusKey?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const hasErrors = errors.length > 0

  useEffect(() => {
    if (hasErrors) ref.current?.focus()
  }, [hasErrors, focusKey])

  if (!hasErrors) return null

  const goTo = (name: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(fieldId(name))
    if (!target) return
    e.preventDefault()
    target.focus()
  }

  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      aria-labelledby="error-summary-title"
      className="flex flex-col gap-1.5 border border-danger bg-danger-bg px-4 py-3.5"
    >
      <h2 id="error-summary-title" className="m-0 text-13 font-semibold text-danger">There is a problem</h2>
      {errors.map((e) => (
        <a key={`${e.name}-${e.message}`} href={`#${fieldId(e.name)}`} onClick={goTo(e.name)} className="inline-flex min-h-6 items-center text-13 text-danger underline">
          {e.message}
        </a>
      ))}
    </div>
  )
}
