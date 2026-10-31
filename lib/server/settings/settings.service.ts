import { SETTING_DEFAULTS, SETTING_KEYS, settingSchemas, tagsFor, type SettingKey } from '@/lib/shared'
import { Prisma } from '@/lib/server/generated/prisma/client'
import { notFound } from '@/lib/server/http/errors'
import { logError } from '@/lib/server/log'
import { prisma } from '@/lib/server/prisma'
import { revalidateSite } from '@/lib/server/revalidate'
import { settingReferences } from './setting-references'

export type SettingValue = unknown

export function isSettingKey(key: string): key is SettingKey {
  return (SETTING_KEYS as readonly string[]).includes(key)
}

/** Resolves a route param to a known key or throws 404. */
export function parseKey(key: string): SettingKey {
  if (!isSettingKey(key)) throw notFound(`Unknown setting: ${key}`)
  return key
}

// A stored row that no longer matches its schema must not take reads down: warn and use the default.
function readStored(key: SettingKey, stored: unknown): SettingValue {
  const result = settingSchemas[key].safeParse(stored)
  if (result.success) return result.data
  logError(`Stored setting "${key}" is invalid, using default: ${result.error.issues[0]?.message ?? 'unknown issue'}`)
  return SETTING_DEFAULTS[key]
}

export async function get(key: SettingKey): Promise<SettingValue> {
  const row = await prisma.setting.findUnique({ where: { key } })
  return row ? readStored(key, row.value) : SETTING_DEFAULTS[key]
}

export async function getAll(): Promise<Record<SettingKey, SettingValue>> {
  const rows = await prisma.setting.findMany()
  const stored = new Map(rows.map((r) => [r.key, r.value]))
  return Object.fromEntries(
    SETTING_KEYS.map((key) => [key, stored.has(key) ? readStored(key, stored.get(key)) : SETTING_DEFAULTS[key]]),
  ) as Record<SettingKey, SettingValue>
}

export async function set(key: SettingKey, raw: unknown): Promise<SettingValue> {
  const value = settingSchemas[key].parse(raw)
  await settingReferences[key]?.(prisma, value)
  const json = value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue)
  await prisma.setting.upsert({ where: { key }, create: { key, value: json }, update: { value: json } })
  revalidateSite(tagsFor('setting'))
  return value
}

/** The old method names under one object, for consumers such as the public layer. */
export const settingsService = { parseKey, get, getAll, set }
