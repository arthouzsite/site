import type { MediaRef } from '../media/types'

export type AdminArtist = {
  id: string
  slug: string
  name: string
  sortName: string
  medium: string
  base: string
  born: string | null
  lede: string
  bio: string
  portraitImageId: string | null
  isFeatured: boolean
  featuredOrder: number
  isPublished: boolean
  createdAt: string
  updatedAt: string
  portraitImage: MediaRef | null
  artworkCount: number
  indexLetter: string
}

export type Artwork = {
  id: string
  artistId: string
  title: string
  year: string
  medium: string
  size: string
  imageId: string | null
  sortOrder: number
  isPublished: boolean
  image: MediaRef | null
}

export type ArtistExhibition = {
  id: string
  title: string
  city: string
  status: 'CURRENT' | 'UPCOMING' | 'PAST'
  startDate?: string
  endDate?: string
  artists: { artist: { id: string; name: string } }[]
}

export type ArtistInUseDetails = {
  exhibitions: { id: string; title: string }[]
  workCount: number
  artworkCount: number
}

export type ArtistListParams = {
  q: string
  letter: string
  featured: string
  published: string
  page: number
  limit: number
}

export const ARTISTS_PAGE_SIZE = 20
export const FEATURED_LIMIT = 100
