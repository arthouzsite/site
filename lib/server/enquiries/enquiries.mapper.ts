import type { Prisma } from '@/lib/server/generated/prisma/client'

/** The ordered print's thumbnail travels with the row so the CMS can show which print it was. */
export const ENQUIRY_INCLUDE = { printMedia: { select: { thumbUrl: true } } } satisfies Prisma.EnquiryInclude
type EnquiryRow = Prisma.EnquiryGetPayload<{ include: typeof ENQUIRY_INCLUDE }>

const ISO_DATE_LENGTH = 10
const day = (value: Date | null): string | null => (value ? value.toISOString().slice(0, ISO_DATE_LENGTH) : null)

export type AdminEnquiry = ReturnType<typeof toAdminEnquiry>

export function toAdminEnquiry(row: EnquiryRow) {
  return {
    id: row.id,
    kind: row.kind,
    subject: row.subject,
    /** The service, artist or print category it was about has since been deleted; `subject` is the snapshot taken at the time. */
    subjectRemoved: row.serviceId === null && row.artistId === null && row.printCategoryId === null,
    /** Thumbnail of the ordered print; null for other enquiries and once that image is deleted. */
    imageUrl: row.printMedia?.thumbUrl ?? null,
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
