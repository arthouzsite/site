import { MIN_PASSWORD_LENGTH, ROLES } from '@/lib/shared'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ErrorSummary } from '../../components/ui/ErrorSummary'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { useToast } from '../../lib/toast'
import { useZodForm } from '../../lib/useZodForm'
import { collectErrors } from '../settings/formErrors'
import { generatePassword } from './password'
import { useCreateUser } from './useUsers'

const schema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(200),
  email: z.string().trim().toLowerCase().min(1, 'Enter an email address').email('Enter a valid email address').max(254),
  role: z.enum(ROLES),
  password: z.string().min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`).max(200),
})
const EMPTY = { name: '', email: '', role: 'EDITOR' as const, password: '' }

type Props = { onInvited: (invite: { name: string; password: string }) => void }

export function InviteForm({ onInvited }: Props) {
  const toast = useToast()
  const create = useCreateUser()
  const form = useZodForm(schema, EMPTY)
  const { register, handleSubmit, reset, setValue, formState, applyServerErrors } = form

  const onSubmit = handleSubmit(async (values) => {
    try {
      await create.mutateAsync(values)
      onInvited({ name: values.name, password: values.password })
      reset(EMPTY)
    } catch (err) {
      applyServerErrors(err)
      toast.error('Could not send the invite. Try again.')
    }
  })
  const { errors } = formState

  return (
    <Card title="Invite user">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[18px]">
        <ErrorSummary errors={collectErrors(errors)} focusKey={formState.submitCount} />
        <Field name="name" label="Name" required error={errors.name?.message}>
          <Input placeholder="Full name" autoComplete="off" {...register('name')} />
        </Field>
        <Field name="email" label="Email" required error={errors.email?.message}>
          <Input type="email" placeholder="name@arthouz.com" autoComplete="off" {...register('email')} />
        </Field>
        <Field name="role" label="Role" help="Editors manage content and media. Admins also manage users and Home & settings.">
          <Select {...register('role')}>
            <option value="EDITOR">Editor</option>
            <option value="ADMIN">Admin</option>
          </Select>
        </Field>
        <Field name="password" label="Temporary password" required help="Share it directly with them. An admin can reset it later." error={errors.password?.message}>
          <Input autoComplete="off" spellCheck={false} {...register('password')} />
        </Field>
        <Button size="sm" className="self-start" onClick={() => setValue('password', generatePassword(), { shouldDirty: true, shouldValidate: formState.isSubmitted })}>
          Generate
        </Button>
        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={create.isPending}>Send invite</Button>
          <Button variant="ghost" onClick={() => reset(EMPTY)}>Cancel</Button>
        </div>
      </form>
    </Card>
  )
}
