import type { MediaRef } from '../media/types'

export type AdminLocation = {
  id: string
  slug: string
  city: string
  address: string
  phone: string
  tel: string
  days: string
  hours: string
  mapUrl: string
  imageId: string | null
  sortOrder: number
  image: MediaRef | null
}
