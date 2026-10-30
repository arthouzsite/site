import type { MediaRef } from '../media/types'

export type NewsExhibition = { id: string; title: string; slug: string }

export type AdminNews = {
  id: string
  slug: string
  title: string
  excerpt: string
  publishedAt: string
  imageId: string | null
  externalUrl: string | null
  exhibitionId: string | null
  isPublished: boolean
  image: MediaRef | null
  monthLabel: string
  exhibition: NewsExhibition | null
  updatedAt?: string
}

export type NewsQuery = { q: string; published: '' | 'true' | 'false'; page: number; limit: number }

const TAMIL = /[஀-௿]/
export const hasTamil = (text: string): boolean => TAMIL.test(text)

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const MONTH_OPTIONS = MONTHS.map((label, value) => ({ value, label }))

export const monthOf = (iso: string): number => new Date(iso).getUTCMonth()
export const yearOf = (iso: string): number => new Date(iso).getUTCFullYear()
/** First day of the month, as the ISO string the API stores. */
export const firstOfMonth = (year: number, month: number): string => new Date(Date.UTC(year, month, 1)).toISOString()
