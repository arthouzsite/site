import type { MediaRef } from '../media/types'

export type AdminService = {
  id: string
  slug: string
  title: string
  summary: string
  body: string
  imageId: string | null
  image: MediaRef | null
  ctaLabel: string
  ctaHref: string
  contactName: string
  contactPhone: string
  contactEmail: string
  sortOrder: number
  isPublished: boolean
  createdAt?: string
  updatedAt?: string
}

export type ServicesQuery = { q: string; page: number; limit: number }

export const DEFAULT_CTA_LABEL = 'Enquire →'

export const serviceUrl = (slug: string) => `/services/${slug}`
