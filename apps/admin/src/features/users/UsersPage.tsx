import { useCallback, useState } from 'react'
import { PageHead } from '../../components/PageHead'
import { Button } from '../../components/ui/Button'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { fieldId } from '../../components/ui/Field'
import { Icon } from '../../components/ui/Icon'
import { ApiError } from '../../lib/api'
import { useToast } from '../../lib/toast'
import { useSession } from '../auth/useSession'
import { InviteForm } from './InviteForm'
import { PasswordRevealDialog } from './PasswordRevealDialog'
import { RoleCapabilities } from './RoleCapabilities'
import { UserDialog } from './UserDialog'
import { UsersTable } from './UsersTable'
import { useDeleteUser, useUsers, type User } from './useUsers'

export default function UsersPage() {
  const toast = useToast()
  const { user: me } = useSession()
  const users = useUsers()
  const remove = useDeleteUser()
  const [editing, setEditing] = useState<User | null>(null)
  const [deleting, setDeleting] = useState<User | null>(null)
  const [invite, setInvite] = useState<{ name: string; password: string } | null>(null)
  const onEdit = useCallback((u: User) => setEditing(u), [])
  const onDelete = useCallback((u: User) => setDeleting(u), [])

  const active = users.data?.filter((u) => !u.isDisabled).length
  const subtitle = active === undefined ? undefined : `${active} ${active === 1 ? 'person' : 'people'} can sign in`

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await remove.mutateAsync(deleting.id)
      toast.success('User deleted')
    } catch (err) {
      toast.error(err instanceof ApiError && err.code === 'CANNOT_DELETE_SELF' ? 'You cannot delete your own account.' : 'Could not delete the user. Try again.')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
      <PageHead
        title="Users"
        subtitle={subtitle}
        actions={<Button variant="primary" onClick={() => document.getElementById(fieldId('name'))?.focus()}><Icon name="plus" />Invite user</Button>}
      />
      {users.isError && <p role="alert" className="m-0 text-13 text-danger">Could not load users. Reload the page.</p>}
      <div className="grid grid-cols-1 items-start gap-8 min-[1100px]:grid-cols-[minmax(0,1fr)_360px]">
        {users.data && <UsersTable users={users.data} selfId={me?.id} onEdit={onEdit} onDelete={onDelete} />}
        <div className="flex flex-col gap-4">
          <InviteForm onInvited={setInvite} />
          <RoleCapabilities />
        </div>
      </div>
      {editing && <UserDialog key={editing.id} user={editing} isSelf={editing.id === me?.id} onClose={() => setEditing(null)} />}
      <ConfirmModal
        open={deleting !== null}
        danger
        busy={remove.isPending}
        title={`Delete ${deleting?.name ?? ''}?`}
        body="Their account is removed and they can no longer sign in. Nothing they edited is changed."
        confirmLabel="Delete"
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
      <PasswordRevealDialog invite={invite} onClose={() => setInvite(null)} />
    </>
  )
}
