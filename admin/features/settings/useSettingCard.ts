import { useQueryClient } from '@tanstack/react-query'
import { SETTING_DEFAULTS, settingSchemas, type SettingKey } from '@/lib/shared'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { FieldValues } from 'react-hook-form'
import { z } from 'zod'
import { api } from '../../lib/api'
import { useToast } from '../../lib/toast'
import { useZodForm, type ZodForm } from '../../lib/useZodForm'
import { useCardRegistry } from './cardRegistry'
import { collectErrors } from './formErrors'
import { SETTINGS_KEY, type SettingsMap } from './useSettings'

/** Maps each form field name to the setting it persists. Form values mirror the settings' own shapes. */
export type KeyMap = Record<string, SettingKey>

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** One form per settings card: validates with the shared schemas and PUTs only the settings that changed. */
export function useSettingCard(id: string, keyMap: KeyMap, settings: Partial<SettingsMap>) {
  const client = useQueryClient()
  const toast = useToast()
  const registry = useCardRegistry()
  const schema = useMemo(
    () => z.object(Object.fromEntries(Object.entries(keyMap).map(([field, key]) => [field, settingSchemas[key]]))),
    [keyMap],
  )
  const defaults = useMemo(
    () => Object.fromEntries(Object.entries(keyMap).map(([field, key]) => [field, settings[key] ?? SETTING_DEFAULTS[key]])),
    [keyMap, settings],
  )
  // Field names are runtime-built from the key map, so the form is deliberately loosely typed.
  const form = useZodForm(schema, defaults) as unknown as ZodForm<FieldValues>
  const { handleSubmit, reset, applyServerErrors, formState } = form
  const saved = useRef<Record<string, unknown>>(defaults)
  const values = form.watch()
  // eslint-disable-next-line react-hooks/refs -- watch() is the form library's public read API; its value is only used during render
  const isDirty = Object.keys(keyMap).some((field) => !same(values[field], saved.current[field]))

  const save = useCallback(async (): Promise<boolean> => {
    let ok = false
    await handleSubmit(async (next) => {
      try {
        for (const [field, key] of Object.entries(keyMap)) {
          if (same(next[field], saved.current[field])) continue
          await api.put(`/settings/${key}`, { value: next[field] })
        }
        saved.current = next
        reset(next)
        await client.invalidateQueries({ queryKey: SETTINGS_KEY })
        toast.success('Saved')
        ok = true
      } catch (err) {
        applyServerErrors(err)
        toast.error('Could not save. Try again.')
      }
    })()
    return ok
  }, [handleSubmit, reset, applyServerErrors, keyMap, client, toast])

  useEffect(() => {
    registry?.setHandle(id, { save })
    return () => registry?.setHandle(id, null)
  }, [registry, id, save])
  useEffect(() => {
    registry?.setDirty(id, isDirty)
  }, [registry, id, isDirty])

  return {
    form,
    isDirty,
    isSaving: formState.isSubmitting,
    errors: collectErrors(formState.errors),
    submitCount: formState.submitCount,
    onSubmit: (e: React.FormEvent) => {
      e.preventDefault()
      void save()
    },
  }
}

export type SettingCard = ReturnType<typeof useSettingCard>
