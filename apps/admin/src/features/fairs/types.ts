import type { MediaRef } from '../media/types'

export type AdminFair = {
  id: string
  slug: string
  title: string
  venue: string
  city: string
  dateLabel: string
  booth: string
  text: string
  imageId: string | null
  sortOrder: number
  isPublished: boolean
  image: MediaRef | null
  where: string
  updatedAt?: string
}
