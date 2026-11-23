export const KOLKATA_TIME_ZONE = 'Asia/Kolkata'
/** The home page's artists line: the first ten published artists by sort name. */
export const HOME_ARTIST_COUNT = 10
export const DEFAULT_COPYRIGHT_FROM = 2026
export const MIN_PASSWORD_LENGTH = 10
export const HERO_LAYOUTS = ['FULL_BLEED', 'SPLIT'] as const
export const ARTIST_INDEX_LAYOUTS = ['GROUPED', 'FLOWING'] as const
export const EXHIBITION_STATUSES = ['CURRENT', 'UPCOMING', 'PAST'] as const
export const EXHIBITION_TYPES = ['SOLO', 'GROUP'] as const
export const ROLES = ['ADMIN', 'EDITOR'] as const
export const ENQUIRY_KINDS = ['SERVICE', 'ARTIST'] as const

export type ExhibitionStatus = (typeof EXHIBITION_STATUSES)[number]
export type ExhibitionType = (typeof EXHIBITION_TYPES)[number]
export type Role = (typeof ROLES)[number]
export type EnquiryKind = (typeof ENQUIRY_KINDS)[number]
export const FAIR_GALLERY_MAX_IMAGES = 15
/** Prints (FIN-3645): the header dropdown lists the categories, each holding a set of images. */
export const PRINT_CATEGORIES_MAX = 15
export const PRINT_CATEGORY_MAX_IMAGES = 20

const BYTES_PER_MB = 1024 * 1024
export const MAX_IMAGE_UPLOAD_BYTES = 2 * BYTES_PER_MB
export const MAX_IMAGE_DIMENSION_PX = 4000
