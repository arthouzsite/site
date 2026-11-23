import type { MediaRef } from '../media/types'

export type AdminPrintCategory = {
  id: string
  slug: string
  name: string
  sortOrder: number
  images: MediaRef[]
}
