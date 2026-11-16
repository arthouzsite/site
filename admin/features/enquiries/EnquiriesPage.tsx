import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useSearchParams } from 'react-router'
import { ENQUIRY_KINDS, type EnquiryKind } from '@/lib/shared'
import { PageHead } from '../../components/PageHead'
import { Button, Chip, ConfirmModal, DataTable, Icon, Pager, RowSwitch, Select } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { formatDateTime } from '../../lib/format'
import { useToast } from '../../lib/toast'
import { EnquiryDetailDialog } from './EnquiryDetailDialog'
import type { AdminEnquiry } from './types'
import { useDeleteEnquiry, useEnquiries, useSetHandled } from './useEnquiries'

const PAGE_SIZE = 25
const KIND_LABEL: Record<EnquiryKind, string> = { SERVICE: 'Service', ARTIST: 'Artist' }
const isKind = (value: string | null): value is EnquiryKind => ENQUIRY_KINDS.some((kind) => kind === value)

export default function EnquiriesPage() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const kindParam = params.get('kind')
  const kind = isKind(kindParam) ? kindParam : null
  const page = Math.max(1, Number(params.get('page')) || 1)
  const list = useEnquiries({ kind, page, limit: PAGE_SIZE })
  const setHandled = useSetHandled()
  const remove = useDeleteEnquiry()
  const [viewing, setViewing] = useState<AdminEnquiry | null>(null)
  const [deleting, setDeleting] = useState<AdminEnquiry | null>(null)
  const items = list.data?.items
  const total = list.data?.total ?? 0

  const update = (changes: Record<string, string | null>) =>
    setParams((current) => {
      const next = new URLSearchParams(current)
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      return next
    }, { replace: true })

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await remove.mutateAsync(deleting.id)
      toast.success('Enquiry deleted')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not delete the enquiry. Try again.')
    } finally {
      setDeleting(null)
    }
  }

  const columns = useMemo<ColumnDef<AdminEnquiry, unknown>[]>(() => {
    const toggle = (row: AdminEnquiry, isHandled: boolean) =>
      setHandled.mutateAsync({ id: row.id, isHandled }).catch((err: unknown) => toast.error(err instanceof ApiError ? err.message : 'Could not change the status'))
    return [
      { id: 'received', header: 'Received', cell: ({ row }) => <span className="text-13 text-muted">{formatDateTime(row.original.createdAt)}</span> },
      { id: 'type', header: 'Type', cell: ({ row }) => <Chip>{KIND_LABEL[row.original.kind]}</Chip> },
      {
        id: 'subject',
        header: 'Subject',
        cell: ({ row }) => (
          <button type="button" onClick={() => setViewing(row.original)} className="block min-h-11 max-w-[260px] cursor-pointer whitespace-normal border-0 bg-transparent p-0 text-left text-14 text-ink underline-offset-2 hover:underline">
            {row.original.subject}
            {row.original.subjectRemoved && <span className="text-muted"> (deleted)</span>}
          </button>
        ),
      },
      { id: 'name', header: 'Name', cell: ({ row }) => <span className="text-14">{row.original.name}</span> },
      { id: 'mobile', header: 'Mobile', cell: ({ row }) => <span className="text-13">{row.original.mobile}</span> },
      { id: 'email', header: 'Email', cell: ({ row }) => <span className="text-13">{row.original.email}</span> },
      {
        id: 'handled',
        header: 'Handled',
        cell: ({ row }) => (
          <RowSwitch
            label={`Handled: ${row.original.name}, ${row.original.subject}`}
            checked={row.original.isHandled}
            disabled={setHandled.isPending}
            onChange={(e) => void toggle(row.original, e.target.checked)}
          />
        ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <span className="inline-flex">
            <Button variant="ghost" size="sm" iconOnly aria-label={`View enquiry from ${row.original.name}`} onClick={() => setViewing(row.original)}><Icon name="eye" /></Button>
            <Button variant="ghost" size="sm" iconOnly aria-label={`Delete enquiry from ${row.original.name}`} onClick={() => setDeleting(row.original)}><Icon name="trash" /></Button>
          </span>
        ),
      },
    ]
  }, [setHandled, toast])

  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Enquiries" subtitle={list.data ? `${total} ${total === 1 ? 'enquiry' : 'enquiries'}` : undefined} />
      <div className="flex w-52 flex-col gap-1.5">
        <label htmlFor="enquiries-kind" className="text-12 font-medium tracking-label text-body">Type</label>
        <Select id="enquiries-kind" value={kind ?? ''} onChange={(e) => update({ kind: e.target.value || null, page: null })}>
          <option value="">All enquiries</option>
          {ENQUIRY_KINDS.map((value) => <option key={value} value={value}>{KIND_LABEL[value]} enquiries</option>)}
        </Select>
      </div>
      {list.isError && <p role="alert" className="m-0 text-13 text-danger">Could not load enquiries. Try again.</p>}
      {items && (
        <>
          <DataTable label={`Enquiries, newest first, ${total} ${total === 1 ? 'record' : 'records'}`} data={items} columns={columns} getRowId={(e) => e.id} empty={kind ? 'No enquiries of this type.' : 'No enquiries yet.'} />
          {total > PAGE_SIZE && <Pager page={page} limit={PAGE_SIZE} total={total} onPage={(p) => update({ page: p > 1 ? String(p) : null })} />}
        </>
      )}
      {viewing && <EnquiryDetailDialog enquiry={viewing} onClose={() => setViewing(null)} />}
      <ConfirmModal
        open={deleting !== null}
        title="Delete enquiry"
        body={deleting ? `Delete the enquiry from ${deleting.name} about ${deleting.subject}? This cannot be undone.` : ''}
        confirmLabel="Delete enquiry"
        danger
        busy={remove.isPending}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
