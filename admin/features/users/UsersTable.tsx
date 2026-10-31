import type { ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import { Button } from '../../components/ui/Button'
import { Chip } from '../../components/ui/Chip'
import { DataTable } from '../../components/ui/DataTable'
import { Icon } from '../../components/ui/Icon'
import { StatusChip } from '../../components/ui/StatusChip'
import { formatLastSignIn, userStatus } from './userFormat'
import type { User } from './useUsers'

type Props = { users: User[]; selfId: string | undefined; onEdit: (u: User) => void; onDelete: (u: User) => void }

function StatusCell({ user }: { user: User }) {
  const status = userStatus(user)
  if (status === 'Active') return <StatusChip status="live" label="Active" />
  if (status === 'Invited') return <StatusChip status="draft" label="Invited" />
  return <Chip>Disabled</Chip>
}

export function UsersTable({ users, selfId, onEdit, onDelete }: Props) {
  const columns = useMemo<ColumnDef<User, unknown>[]>(
    () => [
      {
        header: 'Name',
        cell: ({ row: { original: u } }) => (
          <span className="text-14">
            {u.name}
            {u.id === selfId && <span className="ml-2 bg-hover-ink px-1.5 py-0.5 text-11 uppercase tracking-eyebrow text-muted">You</span>}
          </span>
        ),
      },
      { header: 'Email', cell: ({ row }) => <span className="text-13 text-muted">{row.original.email}</span> },
      {
        header: 'Role',
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-2 text-13">
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${row.original.role === 'ADMIN' ? 'bg-amber' : 'bg-faint'}`} />
            {row.original.role === 'ADMIN' ? 'Admin' : 'Editor'}
          </span>
        ),
      },
      { header: 'Last sign-in', cell: ({ row }) => <span className="text-13 text-muted">{formatLastSignIn(row.original.lastLoginAt)}</span> },
      { header: 'Status', cell: ({ row }) => <StatusCell user={row.original} /> },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row: { original: u } }) => (
          <span className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" iconOnly aria-label={`Edit ${u.name}`} onClick={() => onEdit(u)}><Icon name="edit" /></Button>
            {u.id !== selfId && (
              <Button variant="ghost" size="sm" iconOnly aria-label={`Delete ${u.name}`} onClick={() => onDelete(u)}><Icon name="trash" /></Button>
            )}
          </span>
        ),
      },
    ],
    [selfId, onEdit, onDelete],
  )
  return <DataTable label="Users" data={users} columns={columns} getRowId={(u) => u.id} />
}
