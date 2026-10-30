import { z } from 'zod'
import { EXHIBITION_STATUSES, EXHIBITION_TYPES, HERO_LAYOUTS, ARTIST_INDEX_LAYOUTS } from '../constants'

export const publicImageSchema = z.object({
  url: z.string(), thumbUrl: z.string(), width: z.number(), height: z.number(), alt: z.string(),
})
const image = publicImageSchema.nullable()

export const publicExhibitionSchema = z.object({
  id: z.string(), slug: z.string(), title: z.string(), subtitle: z.string(),
  city: z.string(), country: z.string(), type: z.enum(EXHIBITION_TYPES),
  status: z.enum(EXHIBITION_STATUSES), statusLabel: z.string(), datesLabel: z.string(),
  artistLine: z.string(), image,
})

export const publicArtistSchema = z.object({
  id: z.string(), slug: z.string(), name: z.string(), sortName: z.string(),
  medium: z.string(), base: z.string(), portrait: image,
})

export const publicFairSchema = z.object({
  id: z.string(), slug: z.string(), title: z.string(), where: z.string(),
  booth: z.string(), text: z.string(), image,
})

export const publicNewsSchema = z.object({
  id: z.string(), slug: z.string(), title: z.string(), excerpt: z.string(),
  dateLabel: z.string(), externalUrl: z.string().nullable(),
  exhibition: z.object({ slug: z.string(), title: z.string() }).nullable(), image,
})

export const publicLocationSchema = z.object({
  id: z.string(), slug: z.string(), city: z.string(), address: z.string(), phone: z.string(),
  tel: z.string(), days: z.string(), hours: z.string(), mapUrl: z.string(), image,
})

const publicWorkSchema = z.object({
  id: z.string(), title: z.string(), year: z.string(), artistName: z.string(), medium: z.string(), image,
})

export const publicExhibitionDetailSchema = publicExhibitionSchema.extend({
  venue: z.string(), blurb: z.string(), body: z.string(),
  artists: z.array(publicArtistSchema), works: z.array(publicWorkSchema), press: z.array(publicNewsSchema),
})

export const publicArtistDetailSchema = publicArtistSchema.extend({
  born: z.string().nullable(), lede: z.string(), bio: z.string(),
  exhibitions: z.array(publicExhibitionSchema),
  works: z.array(z.object({
    id: z.string(), title: z.string(), year: z.string(), medium: z.string(), size: z.string(), image,
  })),
})

export const publicSettingsSchema = z.object({
  heroLayout: z.enum(HERO_LAYOUTS),
  artistIndexLayout: z.enum(ARTIST_INDEX_LAYOUTS),
  footer: z.object({
    tagline: z.string(), instagramUrl: z.string(), facebookUrl: z.string(), copyrightFrom: z.number(),
  }),
  site: z.object({ title: z.string(), description: z.string(), ogImage: image }),
})

export const publicAboutSchema = z.object({
  gallery: z.object({ statement: z.string(), body: z.string(), locationsLabel: z.string(), image }),
  proprietor: z.object({ eyebrow: z.string(), name: z.string(), quote: z.string(), body: z.string(), image }),
  services: z.object({ title: z.string(), body: z.string(), ctaLabel: z.string(), image }),
  publications: z.object({ title: z.string(), body: z.string(), externalUrl: z.string().nullable(), image }),
  locations: z.array(publicLocationSchema),
})

export const publicHomeSchema = z.object({
  hero: publicExhibitionSchema.nullable(),
  upcoming: publicExhibitionSchema.nullable(),
  recent: z.array(publicExhibitionSchema),
  abroad: z.array(publicExhibitionSchema),
  focus: z.object({
    artist: publicArtistSchema.nullable(), text: z.string(), image, mediumLabel: z.string(), baseLabel: z.string(),
  }),
  artistsLine: z.array(publicArtistSchema),
  locations: z.array(publicLocationSchema),
  news: z.array(publicNewsSchema),
})

export const publicSearchSchema = z.object({
  artists: z.array(publicArtistSchema),
  exhibitions: z.array(publicExhibitionSchema),
  news: z.array(publicNewsSchema),
})

export type PublicImage = z.infer<typeof publicImageSchema>
export type PublicExhibition = z.infer<typeof publicExhibitionSchema>
export type PublicExhibitionDetail = z.infer<typeof publicExhibitionDetailSchema>
export type PublicArtist = z.infer<typeof publicArtistSchema>
export type PublicArtistDetail = z.infer<typeof publicArtistDetailSchema>
export type PublicFair = z.infer<typeof publicFairSchema>
export type PublicNews = z.infer<typeof publicNewsSchema>
export type PublicLocation = z.infer<typeof publicLocationSchema>
export type PublicHome = z.infer<typeof publicHomeSchema>
export type PublicAbout = z.infer<typeof publicAboutSchema>
export type PublicSettings = z.infer<typeof publicSettingsSchema>
export type PublicSearch = z.infer<typeof publicSearchSchema>
