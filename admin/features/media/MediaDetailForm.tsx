import { z } from 'zod'
import { Button, Field, Input, Textarea } from '../../components/ui'
import { useToast } from '../../lib/toast'
import { useZodForm } from '../../lib/useZodForm'
import type { Media } from './types'
import { useUpdateMedia } from './useMedia'

const schema = z.object({
  alt: z.string().trim().min(1, 'Enter alt text'),
  caption: z.string().trim(),
})

export function MediaDetailForm({ media }: { media: Media }) {
  const toast = useToast()
  const update = useUpdateMedia(media.id)
  const { register, handleSubmit, formState, applyServerErrors } = useZodForm(schema, {
    alt: media.alt,
    caption: media.caption ?? '',
  })
  const { errors, isDirty } = formState

  const onSubmit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync({ alt: values.alt.trim(), caption: values.caption.trim() || null })
      toast.success('Saved')
    } catch (err) {
      applyServerErrors(err)
      toast.error('Could not save. Try again.')
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Field name="alt" label="Alt text" required error={errors.alt?.message} help="Read aloud by screen readers.">
        <Textarea rows={3} {...register('alt')} />
      </Field>
      <Field name="caption" label="Caption" error={errors.caption?.message}>
        <Input {...register('caption')} />
      </Field>
      <Button type="submit" variant="primary" disabled={!isDirty || update.isPending} className="self-start">Save</Button>
    </form>
  )
}
