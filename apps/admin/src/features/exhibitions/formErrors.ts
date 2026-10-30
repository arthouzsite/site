import type { FieldErrors, FieldValues } from 'react-hook-form'
import type { SummaryError } from '../../components/ui/ErrorSummary'

const FORMAT_CODES = new Set(['too_small', 'invalid_type', 'invalid_format', 'invalid_value'])

/** Replaces zod's generic wording with an action ("Enter an end date") unless the server or a custom rule spoke. */
type ErrorLike = { type?: string; message?: string }

export function messageFor(err: ErrorLike | undefined, prompt: string): string | undefined {
  if (!err) return undefined
  if (err.type && FORMAT_CODES.has(err.type)) return prompt
  return err.message
}

export function summaryErrors<T extends FieldValues>(errors: FieldErrors<T>, prompts: Record<string, string>): SummaryError[] {
  return Object.entries(errors).flatMap(([name, err]) => {
    if (name === 'root' || !err) return []
    const message = messageFor(err as ErrorLike, prompts[name] ?? '') || (err as ErrorLike).message
    return message ? [{ name, message }] : []
  })
}
