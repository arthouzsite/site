import { useState } from 'react'
import { z } from 'zod'
import { Button, Dialog, ErrorSummary, Field, Input } from '../../components/ui'
import { useToast } from '../../lib/toast'
import { ApiError } from '../../lib/api'
import { useZodForm } from '../../lib/useZodForm'
import { ImageField } from '../media/ImageField'
import type { MediaRef } from '../media/types'
import type { Artwork } from './types'
import { useSubmitSummary } from './useSubmitSummary'
import { useSaveArtwork } from './useArtists'

export const workFormSchema = z.object({
  title: z.string().trim().min(1, 'Enter a title.').max(300),
  year: z.string().trim().regex(/^(\d{4})?$/, 'Enter a 4-digit year, for example 2026.'),
  medium: z.string().trim().max(300),
  size: z.string().trim().max(100),
})

const FORM_ID = 'work-form'

type Props = { artistId: string; artwork: Artwork | null; onClose: () => void }

export function WorkDialog({ artistId, artwork, onClose }: Props) {
  const toast = useToast()
  const save = useSaveArtwork(artistId)
  const [image, setImage] = useState<MediaRef | null>(artwork?.image ?? null)
  const summary = useSubmitSummary<z.input<typeof workFormSchema>>('title')
  const form = useZodForm(workFormSchema, {
    title: artwork?.title ?? '',
    year: artwork?.year ?? '',
    medium: artwork?.medium ?? '',
    size: artwork?.size ?? '',
  })
  const { register, handleSubmit, formState: { errors } } = form

  const onSubmit = handleSubmit(async (values) => {
    summary.clear()
    try {
      await save.mutateAsync({
        id: artwork?.id ?? null,
        body: { ...values, imageId: image?.id ?? null, isPublished: artwork?.isPublished ?? true },
      })
      toast.success(`Saved · ${values.title}`)
      onClose()
    } catch (err) {
      form.applyServerErrors(err)
      summary.fromServer(err instanceof ApiError ? err.fields : undefined, err instanceof ApiError ? err.message : 'Could not save this work.')
    }
  }, summary.fromInvalid)

  return (
    <Dialog
      open
      title={artwork ? 'Edit work' : 'Add work'}
      onClose={onClose}
      width="w-[min(560px,calc(100vw-32px))]"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" form={FORM_ID} variant="primary" disabled={save.isPending}>Save work</Button>
        </>
      }
    >
      <form id={FORM_ID} noValidate onSubmit={(e) => { e.stopPropagation(); void onSubmit(e) }} className="flex flex-col gap-4">
        <ErrorSummary errors={summary.errors} focusKey={summary.focusKey} />
        <ImageField label="Image" ratio="1/1" value={image} onChange={setImage} />
        <Field name="title" label="Title" required error={errors.title?.message}>
          <Input data-autofocus {...register('title')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="year" label="Year" error={errors.year?.message}>
            <Input inputMode="numeric" maxLength={4} {...register('year')} />
          </Field>
          <Field name="size" label="Size" error={errors.size?.message}>
            <Input {...register('size')} />
          </Field>
        </div>
        <Field name="medium" label="Medium" error={errors.medium?.message}>
          <Input {...register('medium')} />
        </Field>
      </form>
    </Dialog>
  )
}
