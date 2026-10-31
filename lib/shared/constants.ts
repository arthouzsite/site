export const KOLKATA_TIME_ZONE = 'Asia/Kolkata'
export const DEFAULT_HOME_ARTIST_COUNT = 22
export const MAX_HOME_ARTIST_COUNT = 200
export const DEFAULT_COPYRIGHT_FROM = 2026
export const MIN_PASSWORD_LENGTH = 10
export const HERO_LAYOUTS = ['FULL_BLEED', 'SPLIT'] as const
export const ARTIST_INDEX_LAYOUTS = ['GROUPED', 'FLOWING'] as const
export const EXHIBITION_STATUSES = ['CURRENT', 'UPCOMING', 'PAST'] as const
export const EXHIBITION_TYPES = ['SOLO', 'GROUP'] as const
export const ROLES = ['ADMIN', 'EDITOR'] as const

export type ExhibitionStatus = (typeof EXHIBITION_STATUSES)[number]
export type ExhibitionType = (typeof EXHIBITION_TYPES)[number]
export type Role = (typeof ROLES)[number]
