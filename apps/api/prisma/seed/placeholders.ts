import lists from '../seed-data/lists.json'

// Ported from the prototype's ahHash / ahArtist. Do not "fix" the `>>` semantics: they define the seed text.
const HASH_SEED = 7
const HASH_MULTIPLIER = 31
const BORN_BASE_YEAR = 1948
const BORN_YEAR_SPAN = 42
const BASE_SHIFT = 3
const ARTWORK_COUNT = 6
const ARTWORK_POOL_STRIDE = 5
const ARTWORK_YEAR_ANCHOR = 2026
const ARTWORK_YEAR_SPAN = 8
const SIZE_START_CM = 60
const SIZE_STEP_CM = 15
const WIDTH_SPAN = 7
const HEIGHT_SPAN = 6

export interface PlaceholderArtist {
  readonly medium: string
  readonly base: string
  readonly born: string
  readonly lede: string
  readonly bio: string
  readonly portraitMedia: string
}

export interface PlaceholderArtwork {
  readonly title: string
  readonly year: string
  readonly medium: string
  readonly size: string
  readonly imageMedia: string
  readonly sortOrder: number
}

export function ahHash(s: string): number {
  let h = HASH_SEED
  for (let i = 0; i < s.length; i++) h = (h * HASH_MULTIPLIER + s.charCodeAt(i)) >>> 0
  return h
}

function pick<T>(items: readonly T[], index: number): T {
  const item = items[index]
  if (item === undefined) throw new Error(`placeholder list index ${index} out of range`)
  return item
}

export function materialFor(medium: string): string {
  const material = (lists.materials as Record<string, string>)[medium]
  if (material === undefined) throw new Error(`no material for medium "${medium}"`)
  return material
}

export function placeholderArtist(name: string): PlaceholderArtist {
  const h = ahHash(name)
  const medium = pick(lists.media, h % lists.media.length)
  const base = pick(lists.bases, (h >>> BASE_SHIFT) % lists.bases.length)
  const born = BORN_BASE_YEAR + (h % BORN_YEAR_SPAN)
  return {
    medium,
    base,
    born: String(born),
    lede: `${name}’s ${medium.toLowerCase()} returns again and again to land, memory and the rituals of everyday life in South India.`,
    bio: `Born in ${born}, ${name} trained in fine arts before developing an independent practice in ${base}. The work has been shown across India and abroad, and is held in private and institutional collections. With Art Houz, the artist has taken part in group exhibitions in Chennai and Bengaluru and in presentations at international fairs.`,
    portraitMedia: pick(lists.pool, h % lists.pool.length),
  }
}

export function placeholderArtworks(name: string): PlaceholderArtwork[] {
  const h = ahHash(name)
  const medium = materialFor(placeholderArtist(name).medium)
  return Array.from({ length: ARTWORK_COUNT }, (_, i) => ({
    title: pick(lists.workTitles, (h + i) % lists.workTitles.length),
    year: String(ARTWORK_YEAR_ANCHOR - ((h >> i) % ARTWORK_YEAR_SPAN)),
    medium,
    size: `${SIZE_START_CM + ((h >> (i + 2)) % WIDTH_SPAN) * SIZE_STEP_CM} × ${SIZE_START_CM + ((h >> (i + 4)) % HEIGHT_SPAN) * SIZE_STEP_CM} cm`,
    imageMedia: pick(lists.pool, (h + i * ARTWORK_POOL_STRIDE + 1) % lists.pool.length),
    sortOrder: i,
  }))
}

export function exhibitionWorkTitle(slug: string, index: number): string {
  return pick(lists.workTitles, (ahHash(slug) + index) % lists.workTitles.length)
}
