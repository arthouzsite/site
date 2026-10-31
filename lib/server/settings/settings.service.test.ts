import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SETTING_DEFAULTS, SETTING_KEYS } from '@/lib/shared'
import { logError } from '@/lib/server/log'
import { prisma } from '@/lib/server/prisma'
import { revalidateSite } from '@/lib/server/revalidate'
import { get, getAll, isSettingKey, parseKey, set, settingsService } from './settings.service'

vi.mock('@/lib/server/log', () => ({ logError: vi.fn() }))
vi.mock('@/lib/server/revalidate', () => ({ revalidateSite: vi.fn() }))
vi.mock('@/lib/server/prisma', () => ({
  prisma: { setting: { findUnique: vi.fn(), findMany: vi.fn(), upsert: vi.fn() } },
}))

const findUnique = vi.mocked(prisma.setting.findUnique) as unknown as ReturnType<typeof vi.fn>
const findMany = vi.mocked(prisma.setting.findMany) as unknown as ReturnType<typeof vi.fn>
const upsert = vi.mocked(prisma.setting.upsert) as unknown as ReturnType<typeof vi.fn>

describe('settings service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('recognises only declared keys', () => {
    expect(isSettingKey('heroLayout')).toBe(true)
    expect(isSettingKey('nope')).toBe(false)
  })

  it('parseKey returns a known key and 404s an unknown one', () => {
    expect(parseKey('heroLayout')).toBe('heroLayout')
    expect(() => parseKey('nope')).toThrowError(expect.objectContaining({ status: 404, code: 'NOT_FOUND' }))
  })

  it('get returns the default when no row is stored', async () => {
    findUnique.mockResolvedValue(null)
    await expect(get('homeArtistCount')).resolves.toBe(SETTING_DEFAULTS.homeArtistCount)
  })

  it('get returns a valid stored value', async () => {
    findUnique.mockResolvedValue({ key: 'heroLayout', value: 'SPLIT' })
    await expect(get('heroLayout')).resolves.toBe('SPLIT')
    expect(logError).not.toHaveBeenCalled()
  })

  it('get warns and falls back to the default for an invalid stored value', async () => {
    findUnique.mockResolvedValue({ key: 'heroLayout', value: 'BANANA' })
    await expect(get('heroLayout')).resolves.toBe(SETTING_DEFAULTS.heroLayout)
    expect(logError).toHaveBeenCalledWith(expect.stringContaining('Stored setting "heroLayout" is invalid'))
  })

  it('getAll merges stored rows over defaults for every key', async () => {
    findMany.mockResolvedValue([{ key: 'heroLayout', value: 'SPLIT' }])
    const all = await getAll()
    expect(Object.keys(all).sort()).toEqual([...SETTING_KEYS].sort())
    expect(all.heroLayout).toBe('SPLIT')
    expect(all.homeArtistCount).toBe(SETTING_DEFAULTS.homeArtistCount)
  })

  it('set validates, upserts and revalidates', async () => {
    upsert.mockResolvedValue({})
    await expect(set('heroLayout', 'SPLIT')).resolves.toBe('SPLIT')
    expect(upsert).toHaveBeenCalledWith({ where: { key: 'heroLayout' }, create: { key: 'heroLayout', value: 'SPLIT' }, update: { value: 'SPLIT' } })
    expect(revalidateSite).toHaveBeenCalledTimes(1)
  })

  it('set rejects an invalid value without writing or revalidating', async () => {
    await expect(set('heroLayout', 'BANANA')).rejects.toThrow()
    expect(upsert).not.toHaveBeenCalled()
    expect(revalidateSite).not.toHaveBeenCalled()
  })

  it('exposes the old method names on settingsService', () => {
    expect(settingsService).toMatchObject({ parseKey, get, getAll, set })
  })
})
