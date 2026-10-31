import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { ApiError } from './api'
import { useZodForm } from './useZodForm'

const schema = z.object({ title: z.string().min(1, 'Enter a title') })

// Reading formState.errors during render subscribes the hook to error updates, as a component would.
function useSubscribed() {
  const form = useZodForm(schema, { title: '' })
  void form.formState.errors
  return form
}

describe('useZodForm', () => {
  it('maps server field errors and a root message', () => {
    const { result } = renderHook(useSubscribed)
    act(() => result.current.applyServerErrors(new ApiError(400, { code: 'VALIDATION_ERROR', message: 'Check the form', fields: { title: 'Already used' } })))
    expect(result.current.formState.errors.title?.message).toBe('Already used')
    expect(result.current.formState.errors.root?.server?.message).toBe('Check the form')
  })

  it('falls back to a generic message for unknown errors', () => {
    const { result } = renderHook(useSubscribed)
    act(() => result.current.applyServerErrors(new Error('boom')))
    expect(result.current.formState.errors.root?.server?.message).toBe('Something went wrong. Try again.')
  })

  it('validates with the zod schema', async () => {
    const { result } = renderHook(useSubscribed)
    await act(async () => { await result.current.handleSubmit(() => undefined)() })
    expect(result.current.formState.errors.title?.message).toBe('Enter a title')
  })
})
