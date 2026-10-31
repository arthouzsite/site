import type { ExhibitionStatus, ExhibitionType } from '@/lib/shared'
import type { MediaRef } from '../media/types'

export type ArtistLite = { id: string; name: string; medium?: string }

export type AdminExhibition = {
  id: string
  slug: string
  title: string
  subtitle: string
  city: string
  country: string
  type: ExhibitionType
  startDate: string
  endDate: string
  /** The editor's override, or null to use the computed range. */
  datesLabel: string | null
  datesLabelResolved: string
  statusOverride: ExhibitionStatus | null
  venue: string
  blurb: string
  body: string
  heroImageId: string | null
  isPublished: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  status: ExhibitionStatus
  statusLabel: string
  artistLine: string
  heroImage: MediaRef | null
  artists: Array<{ artistId: string; sortOrder: number; artist: { id: string; name: string; slug: string } }>
}

export type ExhibitionWork = {
  id: string
  title: string
  year: string
  medium: string
  sortOrder: number
  artistId: string
  artist: { id: string; name: string }
  image: { id: string; url: string; thumbUrl: string; alt?: string } | null
  artworkId: string | null
}

export type ArtistArtwork = {
  id: string
  title: string
  year: string
  medium: string
  size: string
  image: { id: string; url: string; thumbUrl: string } | null
}

export type NewsLink = {
  id: string
  title: string
  slug: string
  exhibition: { id: string; title: string; slug: string } | null
}

export const STATUS_TO_CHIP = { CURRENT: 'current', UPCOMING: 'upcoming', PAST: 'past' } as const

/** The public site is the same origin as the CMS, so its links are root-relative. */
export const exhibitionUrl = (slug: string) => `/exhibitions/${slug}`
