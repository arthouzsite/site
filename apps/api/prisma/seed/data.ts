import artists from '../seed-data/artists.json'
import exhibitions from '../seed-data/exhibitions.json'
import fairs from '../seed-data/fairs.json'
import locations from '../seed-data/locations.json'
import media from '../seed-data/media.json'
import news from '../seed-data/news.json'
import services from '../seed-data/services.json'

export interface SeedMedia { name: string; id: string; alt: string }
export interface SeedArtist { name: string; placeholder: boolean; featuredOrder?: number }
export interface SeedExhibition {
  slug: string; title: string; subtitle: string; city: string; country: string; type: string
  startDate: string; endDate: string; datesLabel: string | null; venue: string; blurb: string; body: string
  heroImage: string; artists: string[]; works: string[]; sortOrder: number; datesYear: string
}
export interface SeedNews {
  slug: string; title: string; excerpt: string; publishedAt: string; image: string; exhibition: string | null
}
export interface SeedFair {
  slug: string; title: string; venue: string; city: string; dateLabel: string; booth: string; text: string
  image: string; sortOrder: number
}
export interface SeedService {
  slug: string; title: string; summary: string; body: string; image: string; ctaLabel: string; ctaHref: string
  contactName: string; contactPhone: string; contactEmail: string; sortOrder: number
}
export interface SeedLocation {
  slug: string; city: string; address: string; phone: string; tel: string; days: string; hours: string
  mapUrl: string; image: string; sortOrder: number
}

export const seedMedia: readonly SeedMedia[] = media
export const seedArtists: readonly SeedArtist[] = artists
export const seedExhibitions: readonly SeedExhibition[] = exhibitions
export const seedNews: readonly SeedNews[] = news
export const seedFairs: readonly SeedFair[] = fairs
export const seedServices: readonly SeedService[] = services
export const seedLocations: readonly SeedLocation[] = locations
