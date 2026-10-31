import type { FieldErrors, FieldValues } from 'react-hook-form'
import type { SummaryError } from './ErrorSummary'

type Labels = Record<string, string>
type Err = { type?: string; message?: string }

/** Turns generic schema messages into plain language; server messages pass through untouched. */
export function friendlyMessage(label: string, err: Err | undefined): string | undefined {
  if (!err?.message) return undefined
  if (err.type === 'server') return err.message
  if (/^(Too small|Invalid input: expected string, received undefined)/.test(err.message)) return `${label} is required`
  if (/^Too big/.test(err.message)) return `${label} is too long`
  if (/^Invalid (URL|url)/.test(err.message)) return `${label} must be a full web address, starting with https://`
  return err.message
}

/** `idPrefix` namespaces field ids when several forms share a page. */
export function collectErrors<T extends FieldValues>(errors: FieldErrors<T>, labels: Labels, idPrefix = ''): SummaryError[] {
  const out: SummaryError[] = []
  for (const [name, value] of Object.entries(errors)) {
    if (name === 'root') continue
    const message = friendlyMessage(labels[name] ?? name, value as Err)
    if (message) out.push({ name: `${idPrefix}${name}`, message })
  }
  const root = (errors as { root?: { server?: Err } }).root?.server?.message
  if (root && out.length === 0) out.push({ name: `${idPrefix}${Object.keys(labels)[0] ?? 'title'}`, message: root })
  return out
}
