import type { ARTIST_INDEX_LAYOUTS, HERO_LAYOUTS } from '@arthouz/shared'

// Typed views over SettingsService values (already schema-validated or defaulted).
export type HomeFocusSetting = {
  artistId: string | null; text: string; imageId: string | null; mediumLabel: string; baseLabel: string
}
export type HeroLayout = (typeof HERO_LAYOUTS)[number]
export type ArtistIndexLayout = (typeof ARTIST_INDEX_LAYOUTS)[number]
export type FooterSetting = { tagline: string; instagramUrl: string; facebookUrl: string; copyrightFrom: number }
export type SiteSetting = { title: string; description: string; ogImageId: string | null }
type ImageText = { imageId: string | null }
export type AboutGallerySetting = ImageText & { statement: string; body: string; locationsLabel: string }
export type AboutProprietorSetting = ImageText & { eyebrow: string; name: string; quote: string; body: string }
export type AboutServicesSetting = ImageText & { title: string; body: string; ctaLabel: string }
export type AboutPublicationsSetting = ImageText & { title: string; body: string; externalUrl: string | null }
