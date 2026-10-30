import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback } from 'react'
import { useForm, type DefaultValues, type FieldValues, type Path, type UseFormReturn } from 'react-hook-form'
import type { z } from 'zod'
import { ApiError } from './api'

export type ZodForm<T extends FieldValues> = UseFormReturn<T> & {
  applyServerErrors: (err: unknown) => void
}

export function useZodForm<S extends z.ZodType<FieldValues, FieldValues>>(
  schema: S,
  defaults: DefaultValues<z.input<S>>,
): ZodForm<z.input<S>> {
  const form = useForm<z.input<S>>({
    // zodResolver's generics are stricter than RHF's context; the cast keeps input typing intact.
    resolver: zodResolver(schema as never) as never,
    defaultValues: defaults,
  })
  const { setError } = form

  const applyServerErrors = useCallback(
    (err: unknown) => {
      const apiErr = err instanceof ApiError ? err : new ApiError(0, { code: 'UNKNOWN', message: 'Something went wrong. Try again.' })
      for (const [name, message] of Object.entries(apiErr.fields ?? {})) {
        setError(name as Path<z.input<S>>, { type: 'server', message })
      }
      setError('root.server', { type: apiErr.code, message: apiErr.message })
    },
    [setError],
  )

  return { ...form, applyServerErrors } as ZodForm<z.input<S>>
}
