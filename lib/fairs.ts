import { publicFairDetailSchema, type PublicFairDetail } from '@/lib/shared'
import { apiGet } from './api'
import { TAGS } from './tags'

export function getFair(slug: string): Promise<PublicFairDetail> {
  return apiGet(`/public/fairs/${encodeURIComponent(slug)}`, publicFairDetailSchema, [TAGS.fairs, TAGS.fair(slug)])
}
