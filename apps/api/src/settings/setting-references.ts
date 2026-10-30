import { BadRequestException } from '@nestjs/common'
import type { SettingKey } from '@arthouz/shared'
import { assertMediaExists } from '../common/media-exists'
import type { PrismaService } from '../common/prisma.service'

type ReferenceChecker = (prisma: PrismaService, value: any) => Promise<void>

const UNKNOWN_ARTIST = 'UNKNOWN_ARTIST'
const UNKNOWN_EXHIBITION = 'UNKNOWN_EXHIBITION'

const aboutChecker: ReferenceChecker = (prisma, value: { imageId: string | null }) => assertMediaExists(prisma, value.imageId)

// Only keys holding ids of other rows need a checker; the service runs it after schema validation.
export const settingReferences: Partial<Record<SettingKey, ReferenceChecker>> = {
  homeHeroExhibitionId: async (prisma, id: string | null) => {
    if (!id) return
    const row = await prisma.exhibition.findUnique({ where: { id }, select: { id: true } })
    if (!row) throw new BadRequestException({ code: UNKNOWN_EXHIBITION, message: `Unknown exhibition: ${id}` })
  },
  homeFocus: async (prisma, value: { artistId: string | null; imageId: string | null }) => {
    if (value.artistId) {
      const row = await prisma.artist.findUnique({ where: { id: value.artistId }, select: { id: true } })
      if (!row) throw new BadRequestException({ code: UNKNOWN_ARTIST, message: `Unknown artist: ${value.artistId}` })
    }
    await assertMediaExists(prisma, value.imageId)
  },
  'about.gallery': aboutChecker,
  'about.proprietor': aboutChecker,
  'about.services': aboutChecker,
  'about.publications': aboutChecker,
  site: (prisma, value: { ogImageId: string | null }) => assertMediaExists(prisma, value.ogImageId),
}
