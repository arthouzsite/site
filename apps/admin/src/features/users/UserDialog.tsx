import { MIN_PASSWORD_LENGTH, ROLES } from '@arthouz/shared'
import { useState } from 'react'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { Dialog } from '../../components/ui/Dialog'
import { ErrorSummary } from '../../components/ui/ErrorSummary'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Switch } from '../../components/ui/Switch'
import { useToast } from '../../lib/toast'
import { useZodForm } from '../../lib/useZodForm'
import { collectErrors } from '../settings/formErrors'
import { generatePassword } from './password'
import { useUpdateUser, type User, type UserPatch } from './useUsers'

const schema = z.object({
  editName: z.string().trim().min(1, 'Enter a name').max(200),
  editRole: z.enum(ROLES),
  editPassword: z.string().refine((v) => v === '' || v.length >= MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`),
  isDisabled: z.boolean(),
})
type Values = z.input<typeof schema>

function diff(user: User, v: Values): UserPatch {
  return {
    ...(v.editName.trim() !== user.name && { name: v.editName.trim() }),
    ...(v.editRole !== user.role && { role: v.editRole }),
    ...(v.editPassword !== '' && { password: v.editPassword }),
    ...(v.isDisabled !== user.isDisabled && { isDisabled: v.isDisabled }),
  }
}

type Props = { user: User; isSelf: boolean; onClose: () => void }

export function UserDialog({ user, isSelf, onClose }: Props) {
  const toast = useToast()
  const update = useUpdateUser()
  const [pending, setPending] = useState<UserPatch | null>(null)
  const form = useZodForm(schema, { editName: user.name, editRole: user.role, editPassword: '', isDisabled: user.isDisabled })
  const { register, handleSubmit, setValue, formState, applyServerErrors } = form
  const { errors } = formState

  const send = async (patch: UserPatch) => {
    try {
      await update.mutateAsync({ id: user.id, ...patch })
      toast.success('Saved')
      onClose()
    } catch (err) {
      applyServerErrors(err)
      setPending(null)
    }
  }
  const onSubmit = handleSubmit((v) => {
    const patch = diff(user, v)
    if (Object.keys(patch).length === 0) return onClose()
    // Disabling signs the person out, so it needs an explicit confirmation.
    if (patch.isDisabled) return setPending(patch)
    return send(patch)
  })

  return (
    <>
      <Dialog
        open={pending === null}
        title={`Edit ${user.name}`}
        onClose={onClose}
        footer={
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="primary" type="submit" form="user-dialog-form" disabled={update.isPending}>Save</Button>
          </>
        }
      >
        <form id="user-dialog-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-[18px]">
          <ErrorSummary errors={collectErrors(errors)} focusKey={formState.submitCount} />
          <Field name="editName" label="Name" required error={errors.editName?.message}>
            <Input data-autofocus {...register('editName')} />
          </Field>
          <Field name="editRole" label="Role">
            <Select {...register('editRole')}>
              <option value="EDITOR">Editor</option>
              <option value="ADMIN">Admin</option>
            </Select>
          </Field>
          <Field name="editPassword" label="Reset password" help="Leave empty to keep the current password." error={errors.editPassword?.message}>
            <Input autoComplete="new-password" spellCheck={false} {...register('editPassword')} />
          </Field>
          <Button size="sm" className="self-start" onClick={() => setValue('editPassword', generatePassword(), { shouldDirty: true })}>Generate</Button>
          {!isSelf && <Switch label="Disabled" {...register('isDisabled')} />}
        </form>
      </Dialog>
      <ConfirmModal
        open={pending !== null}
        danger
        busy={update.isPending}
        title={`Disable ${user.name}?`}
        body="They will be signed out and cannot sign in until re-enabled. Nothing they edited is changed."
        confirmLabel="Disable"
        onCancel={() => setPending(null)}
        onConfirm={() => pending && void send(pending)}
      />
    </>
  )
}
