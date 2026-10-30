import { z } from 'zod'
import { EXHIBITION_STATUSES, EXHIBITION_TYPES, HERO_LAYOUTS, ARTIST_INDEX_LAYOUTS } from '../constants'

export const publicImageSchema = z.object({
  url: z.string(), thumbUrl: z.string(), width: z.number(), height: z.number(), alt: z.string(),
})
const image = publicImageSchema.nullable()

const nameSlug = z.object({ name: z.string(), slug: z.string() })

export const publicExhibitionSchema = z.object({
  id: z.string(), slug: z.string(), title: z.string(), subtitle: z.string(),
  city: z.string(), country: z.string(), type: z.enum(EXHIBITION_TYPES),
  status: z.enum(EXHIBITION_STATUSES), statusLabel: z.string(), datesLabel: z.string(),
  venue: z.string(), blurb: z.string(), body: z.string(),
  artistLine: z.string(), artists: z.array(nameSlug), image,
})

export const publicArtistSchema = z.object({
  id: z.string(), slug: z.string(), name: z.string(), sortName: z.string(),
  medium: z.string(), base: z.string(), born: z.string().nullable(),
  lede: z.string(), bio: z.string(), image, indexLetter: z.string(),
})

export const publicFairSchema = z.object({
  id: z.string(), slug: z.string(), title: z.string(), where: z.string(),
  booth: z.string(), text: z.string(), image,
})

export const publicNewsSchema = z.object({
  id: z.string(), slug: z.string(), title: z.string(), excerpt: z.string(),
  monthLabel: z.string(), externalUrl: z.string().nullable(),
  exhibition: z.object({ slug: z.string(), title: z.string() }).nullable(), image,
})

export const publicLocationSchema = z.object({
  id: z.string(), slug: z.string(), city: z.string(), address: z.string(), phone: z.string(),
  tel: z.string().nullable(), days: z.string(), hours: z.string(), mapUrl: z.string(), image,
})

const publicExhibitionWorkSchema = z.object({
  id: z.string(), title: z.string(), year: z.string(), artist: z.string(), medium: z.string(), image,
})

export const publicPressSchema = z.object({
  slug: z.string(), title: z.string(), excerpt: z.string(), monthLabel: z.string(),
})

export const publicExhibitionDetailSchema = publicExhibitionSchema.extend({
  meta: z.array(z.object({ k: z.string(), v: z.string() })),
  works: z.array(publicExhibitionWorkSchema),
  press: z.array(publicPressSchema),
})

export const publicArtistDetailSchema = publicArtistSchema.extend({
  exhibitions: z.array(z.object({
    slug: z.string(), title: z.string(), city: z.string(), status: z.enum(EXHIBITION_STATUSES),
  })),
  works: z.array(z.object({
    id: z.string(), title: z.string(), year: z.string(), medium: z.string(), size: z.string(), image,
  })),
})

export const publicExhibitionListSchema = z.object({
  items: z.array(publicExhibitionSchema), cities: z.array(z.string()),
})

export const publicArtistListSchema = z.object({
  featured: z.array(publicArtistSchema),
  groups: z.array(z.object({ letter: z.string(), items: z.array(publicArtistSchema) })),
  flat: z.array(publicArtistSchema),
  layout: z.enum(ARTIST_INDEX_LAYOUTS),
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
})

export const publicHomeSchema = z.object({
  hero: publicExhibitionSchema.nullable(),
  heroLayout: z.enum(HERO_LAYOUTS),
  upcoming: publicExhibitionSchema.nullable(),
  recent: z.array(publicExhibitionSchema),
  world: z.array(publicExhibitionSchema),
  focus: z.object({
    artist: z.object({ slug: z.string(), name: z.string() }).nullable(),
    text: z.string(), mediumLabel: z.string(), baseLabel: z.string(), image,
  }),
  artistsLine: z.array(nameSlug),
  locations: z.array(publicLocationSchema),
  news: z.array(publicNewsSchema),
})

export const publicSearchSchema = z.object({
  groups: z.array(z.object({
    label: z.enum(['Artists', 'Exhibitions', 'News']),
    items: z.array(z.object({ label: z.string(), href: z.string() })),
  })),
})

export type PublicImage = z.infer<typeof publicImageSchema>
export type PublicExhibition = z.infer<typeof publicExhibitionSchema>
export type PublicExhibitionDetail = z.infer<typeof publicExhibitionDetailSchema>
export type PublicArtist = z.infer<typeof publicArtistSchema>
export type PublicArtistDetail = z.infer<typeof publicArtistDetailSchema>
export type PublicFair = z.infer<typeof publicFairSchema>
export type PublicNews = z.infer<typeof publicNewsSchema>
export type PublicExhibitionList = z.infer<typeof publicExhibitionListSchema>
export type PublicArtistList = z.infer<typeof publicArtistListSchema>
export type PublicLocation = z.infer<typeof publicLocationSchema>
export type PublicHome = z.infer<typeof publicHomeSchema>
export type PublicAbout = z.infer<typeof publicAboutSchema>
export type PublicSettings = z.infer<typeof publicSettingsSchema>
export type PublicSearch = z.infer<typeof publicSearchSchema>
