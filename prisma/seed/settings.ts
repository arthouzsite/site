import { Prisma, type PrismaClient } from '../../lib/server/generated/prisma/client'
import { settingSchemas, type SettingKey } from '@/lib/shared'
import about from '../seed-data/about.json'
import settings from '../seed-data/settings.json'

type IdLookup = (name: string) => string

interface Resolvers {
  readonly mediaId: IdLookup
  readonly artistId: IdLookup
}

function withoutKey<T extends object>(obj: T, key: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => k !== key))
}

export function buildSettingValues(r: Resolvers): Record<SettingKey, unknown> {
  const { homeFocus, site } = settings
  const aboutValues = Object.fromEntries(
    Object.entries(about).map(([key, section]) => [key, { ...withoutKey(section, 'imageName'), imageId: r.mediaId(section.imageName) }]),
  )
  return {
    heroLayout: settings.heroLayout,
    artistIndexLayout: settings.artistIndexLayout,
    homeHeroExhibitionId: settings.homeHeroExhibitionId,
    homeArtistCount: settings.homeArtistCount,
    homeFocus: {
      artistId: r.artistId(homeFocus.artistName),
      text: homeFocus.text,
      imageId: r.mediaId(homeFocus.imageName),
      mediumLabel: homeFocus.mediumLabel,
      baseLabel: homeFocus.baseLabel,
    },
    ...aboutValues,
    footer: settings.footer,
    site: { title: site.title, description: site.description, ogImageId: null },
  } as Record<SettingKey, unknown>
}

export async function seedSettings(prisma: PrismaClient, values: Record<SettingKey, unknown>): Promise<void> {
  for (const [key, raw] of Object.entries(values) as [SettingKey, unknown][]) {
    const value = settingSchemas[key].parse(raw)
    const json = value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue)
    await prisma.setting.upsert({ where: { key }, create: { key, value: json }, update: { value: json } })
  }
}
