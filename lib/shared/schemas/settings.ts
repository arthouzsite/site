import { z, type ZodType } from 'zod'
import {
  ARTIST_INDEX_LAYOUTS, DEFAULT_COPYRIGHT_FROM, HERO_LAYOUTS,
} from '../constants'
import { httpUrl, idSchema } from './common'

export const SETTING_KEYS = [
  'heroLayout', 'artistIndexLayout', 'homeHeroExhibitionId', 'homeFocus',
  'about.gallery', 'about.proprietor', 'about.services', 'about.publications', 'footer', 'site', 'maintenance',
] as const
export type SettingKey = (typeof SETTING_KEYS)[number]

const text = z.string()
const nullableId = idSchema.nullable()
const nullableUrl = httpUrl().nullable()
/** Optional social link: an http(s) URL, or '' when unset. */
const optionalSocialUrl = httpUrl().or(z.literal(''))

export const settingSchemas: { [K in SettingKey]: ZodType } = {
  heroLayout: z.enum(HERO_LAYOUTS),
  artistIndexLayout: z.enum(ARTIST_INDEX_LAYOUTS),
  homeHeroExhibitionId: nullableId,
  homeFocus: z.object({
    artistId: nullableId, text, imageId: nullableId, mediumLabel: text, baseLabel: text,
  }),
  'about.gallery': z.object({ statement: text, body: text, locationsLabel: text, imageId: nullableId }),
  'about.proprietor': z.object({ eyebrow: text, name: text, quote: text, body: text, imageId: nullableId }),
  'about.services': z.object({ title: text, body: text, ctaLabel: text, imageId: nullableId }),
  'about.publications': z.object({ title: text, body: text, externalUrl: nullableUrl, imageId: nullableId }),
  footer: z.object({
    tagline: text, instagramUrl: optionalSocialUrl, facebookUrl: optionalSocialUrl, copyrightFrom: z.number().int(),
    // Added after launch: footers saved before these keys existed must still parse, with them empty.
    linkedinUrl: optionalSocialUrl.default(''), youtubeUrl: optionalSocialUrl.default(''), twitterUrl: optionalSocialUrl.default(''),
  }),
  site: z.object({ title: text, description: text, ogImageId: nullableId }),
  /** While enabled, every public page shows the maintenance screen instead of its content; the CMS stays open. */
  maintenance: z.object({ isEnabled: z.boolean() }),
}

export const SETTING_DEFAULTS: Record<SettingKey, unknown> = {
  heroLayout: 'FULL_BLEED',
  artistIndexLayout: 'GROUPED',
  homeHeroExhibitionId: null,
  homeFocus: { artistId: null, text: '', imageId: null, mediumLabel: '', baseLabel: '' },
  'about.gallery': { statement: '', body: '', locationsLabel: '', imageId: null },
  'about.proprietor': { eyebrow: '', name: '', quote: '', body: '', imageId: null },
  'about.services': { title: '', body: '', ctaLabel: '', imageId: null },
  'about.publications': { title: '', body: '', externalUrl: null, imageId: null },
  footer: {
    tagline: '', instagramUrl: '', facebookUrl: '', linkedinUrl: '', youtubeUrl: '', twitterUrl: '', copyrightFrom: DEFAULT_COPYRIGHT_FROM,
  },
  site: { title: '', description: '', ogImageId: null },
  maintenance: { isEnabled: false },
}
