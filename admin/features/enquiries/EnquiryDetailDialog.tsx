import type { ReactNode } from 'react'
import { Button, Dialog } from '../../components/ui'
import { formatDateTime } from '../../lib/format'
import type { AdminEnquiry } from './types'

const KIND_LABEL = { SERVICE: 'Service', ARTIST: 'Artist', PRINT: 'Print order' } as const
const SUBJECT_LABEL = { SERVICE: 'Service', ARTIST: 'Artist', PRINT: 'Print' } as const
const dayFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const formatDay = (iso: string): string => dayFmt.format(new Date(`${iso}T00:00:00.000Z`))

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-4 border-t border-line py-2.5 first:border-t-0">
      <dt className="text-12 text-muted">{label}</dt>
      <dd className="m-0 min-w-0 whitespace-pre-wrap break-words text-14 text-ink">{children}</dd>
    </div>
  )
}

export function EnquiryDetailDialog({ enquiry, onClose }: { enquiry: AdminEnquiry; onClose: () => void }) {
  const { dateFrom, dateTo } = enquiry
  return (
    <Dialog open title={`Enquiry from ${enquiry.name}`} onClose={onClose} width="w-[min(560px,calc(100vw-32px))]" footer={<Button data-autofocus onClick={onClose}>Close</Button>}>
      <dl className="m-0 flex flex-col">
        <Row label="Received">{formatDateTime(enquiry.createdAt)}</Row>
        <Row label="Type">{KIND_LABEL[enquiry.kind]}</Row>
        <Row label={SUBJECT_LABEL[enquiry.kind]}>
          {enquiry.subject}{enquiry.subjectRemoved ? ' (deleted)' : ''}
          {/* eslint-disable-next-line @next/next/no-img-element -- a stored thumbnail on the CDN; next/image has nothing to add at this size. */}
          {enquiry.imageUrl && <img src={enquiry.imageUrl} alt="" className="mt-2 block h-24 w-auto border border-line" />}
        </Row>
        <Row label="Name">{enquiry.name}</Row>
        <Row label="Mobile"><a href={`tel:${enquiry.mobile}`} className="text-ink underline-offset-2 hover:underline">{enquiry.mobile}</a></Row>
        <Row label="Email"><a href={`mailto:${enquiry.email}`} className="text-ink underline-offset-2 hover:underline">{enquiry.email}</a></Row>
        {dateFrom && dateTo && <Row label="Dates">{formatDay(dateFrom)} to {formatDay(dateTo)}</Row>}
        {enquiry.purpose && <Row label="Purpose">{enquiry.purpose}</Row>}
        {enquiry.location && <Row label="Location">{enquiry.location}</Row>}
        <Row label="Message">{enquiry.message || '—'}</Row>
        <Row label="Status">{enquiry.isHandled ? 'Handled' : 'Not handled yet'}</Row>
      </dl>
    </Dialog>
  )
}
