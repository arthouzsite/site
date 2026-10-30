import type { FieldErrors, FieldValues } from 'react-hook-form'
import type { SummaryError } from '../../components/ui/ErrorSummary'

function walk(node: unknown, path: string, out: SummaryError[]): void {
  if (!node || typeof node !== 'object') return
  const { message } = node as { message?: unknown }
  if (typeof message === 'string') {
    out.push({ name: path, message })
    return
  }
  for (const [key, child] of Object.entries(node)) {
    if (key !== 'ref') walk(child, path ? `${path}.${key}` : key, out)
  }
}

export function collectErrors(errors: FieldErrors<FieldValues>): SummaryError[] {
  const out: SummaryError[] = []
  walk(errors, '', out)
  return out
}
