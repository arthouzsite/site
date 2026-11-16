import type { EnquiryKind } from '@/lib/shared'

export type AdminEnquiry = {
  id: string
  kind: EnquiryKind
  subject: string
  subjectRemoved: boolean
  name: string
  email: string
  mobile: string
  message: string
  dateFrom: string | null
  dateTo: string | null
  purpose: string | null
  location: string | null
  isHandled: boolean
  createdAt: string
}

export type EnquiriesQuery = { kind: EnquiryKind | null; page: number; limit: number }
