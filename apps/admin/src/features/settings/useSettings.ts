import { useQuery } from '@tanstack/react-query'
import { SETTING_DEFAULTS, type SettingKey } from '@arthouz/shared'
import { api } from '../../lib/api'
import { useSession } from '../auth/useSession'

export type SettingsMap = Record<SettingKey, unknown>
export const SETTINGS_KEY = ['settings'] as const

export function useSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: async (): Promise<SettingsMap> => ({ ...SETTING_DEFAULTS, ...(await api.get<Partial<SettingsMap>>('/settings')) }),
  })
}

/** Settings are writable by administrators only. */
export function useCanEditSettings(): boolean {
  return useSession().user?.role === 'ADMIN'
}
