import type { Enquiry } from '@/lib/server/generated/prisma/client'

const ISO_DATE_LENGTH = 10
const day = (value: Date | null): string | null => (value ? value.toISOString().slice(0, ISO_DATE_LENGTH) : null)

export type AdminEnquiry = ReturnType<typeof toAdminEnquiry>

export function toAdminEnquiry(row: Enquiry) {
  return {
    id: row.id,
    kind: row.kind,
    subject: row.subject,
    /** The service or artist it was about has since been deleted; `subject` is the snapshot taken at the time. */
    subjectRemoved: row.serviceId === null && row.artistId === null,
    name: row.name,
    email: row.email,
    mobile: row.mobile,
    message: row.message,
    dateFrom: day(row.dateFrom),
    dateTo: day(row.dateTo),
    purpose: row.purpose,
    location: row.location,
    isHandled: row.isHandled,
    createdAt: row.createdAt.toISOString(),
  }
}
