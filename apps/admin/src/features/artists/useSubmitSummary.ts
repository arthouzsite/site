import { useCallback, useState } from 'react'
import type { FieldErrors, FieldValues } from 'react-hook-form'
import type { SummaryError } from '../../components/ui/ErrorSummary'

type State = { errors: SummaryError[]; focusKey: number }

/**
 * Error summary snapshot taken at submit time. Live per-field revalidation must not re-show
 * (and re-focus) the summary while the user is typing, so it only changes on a submit attempt.
 */
export function useSubmitSummary<T extends FieldValues>(fallbackField: string) {
  const [state, setState] = useState<State>({ errors: [], focusKey: 0 })

  const show = useCallback((errors: SummaryError[]) => setState((cur) => ({ errors, focusKey: cur.focusKey + 1 })), [])
  const clear = useCallback(() => setState((cur) => ({ ...cur, errors: [] })), [])

  const fromInvalid = useCallback(
    (errors: FieldErrors<T>) =>
      show(
        Object.entries(errors).flatMap(([name, err]) => {
          const message = (err as { message?: unknown } | undefined)?.message
          return typeof message === 'string' && message ? [{ name, message }] : []
        }),
      ),
    [show],
  )
  const fromServer = useCallback(
    (fields: Record<string, string> | undefined, message: string) => {
      const entries = Object.entries(fields ?? {})
      show(entries.length > 0 ? entries.map(([name, text]) => ({ name, message: text })) : [{ name: fallbackField, message }])
    },
    [fallbackField, show],
  )

  return { errors: state.errors, focusKey: state.focusKey, fromInvalid, fromServer, clear }
}
