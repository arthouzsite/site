import type { SettingKey } from '@/lib/shared'
import { assertMediaExists } from '@/lib/server/common/media-exists'
import { badRequest } from '@/lib/server/http/errors'
import type { PrismaClient } from '@/lib/server/generated/prisma/client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReferenceChecker = (prisma: PrismaClient, value: any) => Promise<void>

const UNKNOWN_ARTIST = 'UNKNOWN_ARTIST'
const UNKNOWN_EXHIBITION = 'UNKNOWN_EXHIBITION'

const aboutChecker: ReferenceChecker = (prisma, value: { imageId: string | null }) => assertMediaExists(prisma, value.imageId)

// Only keys holding ids of other rows need a checker; the service runs it after schema validation.
export const settingReferences: Partial<Record<SettingKey, ReferenceChecker>> = {
  homeHeroExhibitionId: async (prisma, id: string | null) => {
    if (!id) return
    const row = await prisma.exhibition.findUnique({ where: { id }, select: { id: true } })
    if (!row) throw badRequest(UNKNOWN_EXHIBITION, `Unknown exhibition: ${id}`)
  },
  homeFocus: async (prisma, value: { artistId: string | null; imageId: string | null }) => {
    if (value.artistId) {
      const row = await prisma.artist.findUnique({ where: { id: value.artistId }, select: { id: true } })
      if (!row) throw badRequest(UNKNOWN_ARTIST, `Unknown artist: ${value.artistId}`)
    }
    await assertMediaExists(prisma, value.imageId)
  },
  'about.gallery': aboutChecker,
  'about.proprietor': aboutChecker,
  'about.services': aboutChecker,
  'about.publications': aboutChecker,
  site: (prisma, value: { ogImageId: string | null }) => assertMediaExists(prisma, value.ogImageId),
}
