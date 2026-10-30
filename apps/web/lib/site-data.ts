import { publicLocationSchema, publicSettingsSchema, type PublicLocation, type PublicSettings } from '@arthouz/shared'
import { z } from 'zod'
import { apiGet } from './api'
import { TAGS } from './tags'

export function getSettings(): Promise<PublicSettings> {
  return apiGet('/public/settings', publicSettingsSchema, [TAGS.settings])
}

export function getLocations(): Promise<PublicLocation[]> {
  return apiGet('/public/locations', z.array(publicLocationSchema), [TAGS.locations])
}
