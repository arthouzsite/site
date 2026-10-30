import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { SETTING_DEFAULTS, SETTING_KEYS, settingSchemas, tagsFor, type SettingKey } from '@arthouz/shared'
import { PrismaService } from '../common/prisma.service'
import { Prisma } from '../generated/prisma/client'
import { RevalidateService } from '../revalidate/revalidate.service'
import { settingReferences } from './setting-references'

export type SettingValue = unknown

export function isSettingKey(key: string): key is SettingKey {
  return (SETTING_KEYS as readonly string[]).includes(key)
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidate: RevalidateService,
  ) {}

  /** Resolves a route param to a known key or throws 404. */
  parseKey(key: string): SettingKey {
    if (!isSettingKey(key)) throw new NotFoundException({ code: 'NOT_FOUND', message: `Unknown setting: ${key}` })
    return key
  }

  async get(key: SettingKey): Promise<SettingValue> {
    const row = await this.prisma.setting.findUnique({ where: { key } })
    return row ? this.readStored(key, row.value) : SETTING_DEFAULTS[key]
  }

  // A stored row that no longer matches its schema must not take reads down: warn and use the default.
  private readStored(key: SettingKey, stored: unknown): SettingValue {
    const result = settingSchemas[key].safeParse(stored)
    if (result.success) return result.data
    this.logger.warn(`Stored setting "${key}" is invalid, using default: ${result.error.issues[0]?.message ?? 'unknown issue'}`)
    return SETTING_DEFAULTS[key]
  }

  async getAll(): Promise<Record<SettingKey, SettingValue>> {
    const rows = await this.prisma.setting.findMany()
    const stored = new Map(rows.map((r) => [r.key, r.value]))
    return Object.fromEntries(
      SETTING_KEYS.map((key) => [key, stored.has(key) ? this.readStored(key, stored.get(key)) : SETTING_DEFAULTS[key]]),
    ) as Record<SettingKey, SettingValue>
  }

  async set(key: SettingKey, raw: unknown): Promise<SettingValue> {
    const value = settingSchemas[key].parse(raw)
    await settingReferences[key]?.(this.prisma, value)
    const json = value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue)
    await this.prisma.setting.upsert({ where: { key }, create: { key, value: json }, update: { value: json } })
    this.revalidate.trigger(tagsFor('setting'))
    return value
  }
}
