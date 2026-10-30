import type { PrismaService } from '../common/prisma.service'

export type MediaUsage = { type: string; id: string; title: string }

type Row = { id: string; label: string }
const toUsage = (type: string, rows: Row[]): MediaUsage[] => rows.map((r) => ({ type, id: r.id, title: r.label }))

export async function findMediaUsage(prisma: PrismaService, mediaId: string): Promise<MediaUsage[]> {
  const [exhibitions, works, artists, artworks, fairs, news, locations] = await Promise.all([
    prisma.exhibition.findMany({ where: { heroImageId: mediaId }, select: { id: true, title: true } }),
    prisma.exhibitionWork.findMany({ where: { imageId: mediaId }, select: { id: true, title: true } }),
    prisma.artist.findMany({ where: { portraitImageId: mediaId }, select: { id: true, name: true } }),
    prisma.artwork.findMany({ where: { imageId: mediaId }, select: { id: true, title: true } }),
    prisma.fair.findMany({ where: { imageId: mediaId }, select: { id: true, title: true } }),
    prisma.news.findMany({ where: { imageId: mediaId }, select: { id: true, title: true } }),
    prisma.location.findMany({ where: { imageId: mediaId }, select: { id: true, city: true } }),
  ])
  return [
    ...toUsage('exhibition', exhibitions.map((r) => ({ id: r.id, label: r.title }))),
    ...toUsage('exhibitionWork', works.map((r) => ({ id: r.id, label: r.title }))),
    ...toUsage('artist', artists.map((r) => ({ id: r.id, label: r.name }))),
    ...toUsage('artwork', artworks.map((r) => ({ id: r.id, label: r.title }))),
    ...toUsage('fair', fairs.map((r) => ({ id: r.id, label: r.title }))),
    ...toUsage('news', news.map((r) => ({ id: r.id, label: r.title }))),
    ...toUsage('location', locations.map((r) => ({ id: r.id, label: r.city }))),
  ]
}
