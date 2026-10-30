import type { PrismaService } from '../common/prisma.service'

export type MediaUsage = { type: string; id: string; title: string }

type Row = { id: string; label: string }
const toUsage = (type: string, rows: Row[]): MediaUsage[] => rows.map((r) => ({ type, id: r.id, title: r.label }))

// Settings that embed a media id, with the JSON path(s) holding it and a human label for the admin.
const SETTING_MEDIA_REFERENCES: ReadonlyArray<{ key: string; field: 'imageId' | 'ogImageId'; label: string }> = [
  { key: 'homeFocus', field: 'imageId', label: 'Home focus' },
  { key: 'about.gallery', field: 'imageId', label: 'About: gallery' },
  { key: 'about.proprietor', field: 'imageId', label: 'About: proprietor' },
  { key: 'about.services', field: 'imageId', label: 'About: services' },
  { key: 'about.publications', field: 'imageId', label: 'About: publications' },
  { key: 'site', field: 'ogImageId', label: 'Site social image' },
]

async function findSettingUsage(prisma: PrismaService, mediaId: string): Promise<MediaUsage[]> {
  const rows = await prisma.setting.findMany({ where: { key: { in: SETTING_MEDIA_REFERENCES.map((r) => r.key) } } })
  const stored = new Map(rows.map((r) => [r.key, r.value]))
  return SETTING_MEDIA_REFERENCES.filter(({ key, field }) => {
    const value = stored.get(key)
    return typeof value === 'object' && value !== null && (value as Record<string, unknown>)[field] === mediaId
  }).map(({ key, label }) => ({ type: 'setting', id: key, title: label }))
}

export async function findMediaUsage(prisma: PrismaService, mediaId: string): Promise<MediaUsage[]> {
  const [exhibitions, works, artists, artworks, fairs, news, locations, settings] = await Promise.all([
    prisma.exhibition.findMany({ where: { heroImageId: mediaId }, select: { id: true, title: true } }),
    prisma.exhibitionWork.findMany({ where: { imageId: mediaId }, select: { id: true, title: true } }),
    prisma.artist.findMany({ where: { portraitImageId: mediaId }, select: { id: true, name: true } }),
    prisma.artwork.findMany({ where: { imageId: mediaId }, select: { id: true, title: true } }),
    prisma.fair.findMany({ where: { imageId: mediaId }, select: { id: true, title: true } }),
    prisma.news.findMany({ where: { imageId: mediaId }, select: { id: true, title: true } }),
    prisma.location.findMany({ where: { imageId: mediaId }, select: { id: true, city: true } }),
    findSettingUsage(prisma, mediaId),
  ])
  return [
    ...toUsage('exhibition', exhibitions.map((r) => ({ id: r.id, label: r.title }))),
    ...toUsage('exhibitionWork', works.map((r) => ({ id: r.id, label: r.title }))),
    ...toUsage('artist', artists.map((r) => ({ id: r.id, label: r.name }))),
    ...toUsage('artwork', artworks.map((r) => ({ id: r.id, label: r.title }))),
    ...toUsage('fair', fairs.map((r) => ({ id: r.id, label: r.title }))),
    ...toUsage('news', news.map((r) => ({ id: r.id, label: r.title }))),
    ...toUsage('location', locations.map((r) => ({ id: r.id, label: r.city }))),
    ...settings,
  ]
}
