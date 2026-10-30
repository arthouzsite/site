import { useEffect, useId, useRef } from 'react'
import { fieldId } from './Field'

export type SummaryError = { name: string; message: string }

/** `focusKey` (e.g. a submit count) re-focuses the summary when the same errors are shown again. */
export function ErrorSummary({ errors, focusKey, idPrefix }: { errors: SummaryError[]; focusKey?: number; idPrefix?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const hasErrors = errors.length > 0

  useEffect(() => {
    if (hasErrors) ref.current?.focus()
  }, [hasErrors, focusKey])

  if (!hasErrors) return null

  const goTo = (name: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById(fieldId(name, idPrefix))
    if (!target) return
    e.preventDefault()
    target.focus()
  }

  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      aria-labelledby={titleId}
      className="flex flex-col gap-1.5 border border-danger bg-danger-bg px-4 py-3.5"
    >
      <h2 id={titleId} className="m-0 text-13 font-semibold text-danger">There is a problem</h2>
      {errors.map((e) => (
        <a key={`${e.name}-${e.message}`} href={`#${fieldId(e.name, idPrefix)}`} onClick={goTo(e.name)} className="inline-flex min-h-11 items-center text-13 text-danger underline">
          {e.message}
        </a>
      ))}
    </div>
  )
}
