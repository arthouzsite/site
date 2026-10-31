import { useState } from 'react'
import { fairInputSchema } from '@/lib/shared'
import { useNavigate, useParams } from 'react-router'
import { useBreadcrumb } from '../../app/breadcrumb'
import { PageHead } from '../../components/PageHead'
import { Button, ConfirmModal, ErrorSummary, Field, Input, LinkButton, PrefixInput, Switch, Textarea, collectErrors } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { useToast } from '../../lib/toast'
import { useZodForm } from '../../lib/useZodForm'
import { ImageField } from '../media/ImageField'
import type { MediaRef } from '../media/types'
import type { AdminFair } from './types'
import { useDeleteFair, useFair, usePublishFair, useSaveFair } from './useFairs'

const LABELS = { title: 'Title', venue: 'Venue', city: 'City', dateLabel: 'Date label', booth: 'Booth', text: 'Text', slug: 'Slug' }

export default function FairEditor() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const query = useFair(isNew ? undefined : id)
  useBreadcrumb(isNew ? 'New fair' : query.data?.title ?? (query.isError ? 'Unavailable' : 'Loading…'))
  if (isNew) return <FairForm fair={null} />
  // Keyed so navigating straight from one fair to another remounts the form with the new record.
  if (query.data) return <FairForm key={query.data.id} fair={query.data} />
  if (query.isError) return <p role="alert" className="m-0 text-13 text-danger">Could not load this fair.</p>
  return <p className="m-0 text-13 text-muted">Loading fair</p>
}

function FairForm({ fair }: { fair: AdminFair | null }) {
  const toast = useToast()
  const navigate = useNavigate()
  const save = useSaveFair(fair?.id)
  const publish = usePublishFair()
  const remove = useDeleteFair()
  const [image, setImage] = useState<MediaRef | null>(fair?.image ?? null)
  const [submits, setSubmits] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const form = useZodForm(fairInputSchema, {
    slug: fair?.slug,
    title: fair?.title ?? '',
    venue: fair?.venue ?? '',
    city: fair?.city ?? '',
    dateLabel: fair?.dateLabel ?? '',
    booth: fair?.booth ?? '',
    text: fair?.text ?? '',
    imageId: fair?.imageId ?? null,
    sortOrder: fair?.sortOrder ?? 0,
    isPublished: fair?.isPublished ?? false,
  })
  const { register, handleSubmit, formState: { errors, isDirty }, setValue, reset } = form
  const err = (name: keyof typeof LABELS) => errors[name]?.message as string | undefined

  const pickImage = (ref: MediaRef | null) => {
    setImage(ref)
    setValue('imageId', ref?.id ?? null, { shouldDirty: true })
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync(values)
      toast.success(`Saved · ${saved.title}`)
      if (fair) reset(values)
      else navigate(`/fairs/${saved.id}`, { replace: true })
    } catch (e) {
      form.applyServerErrors(e)
    }
  }, () => setSubmits((n) => n + 1))

  const togglePublish = async (isPublished: boolean) => {
    if (!fair) return
    try {
      await publish.mutateAsync({ id: fair.id, isPublished })
      toast.success(`${isPublished ? 'Published' : 'Unpublished'} · ${fair.title}`)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not change publish state')
    }
  }

  const confirmDelete = async () => {
    if (!fair) return
    try {
      await remove.mutateAsync(fair.id)
      toast.success(`Deleted · ${fair.title}`)
      navigate('/fairs', { replace: true })
    } catch (e) {
      setConfirming(false)
      toast.error(e instanceof ApiError ? e.message : 'Could not delete the fair')
    }
  }

  const slugAsUndefined = { setValueAs: (v: unknown) => (typeof v === 'string' ? v.trim() : '') || undefined }

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={fair?.title ?? 'New fair'} />
      <form noValidate onSubmit={(e) => void onSubmit(e)} className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-8 max-[1100px]:grid-cols-1">
        <div className="flex min-w-0 flex-col gap-5">
          <ErrorSummary errors={collectErrors(errors, LABELS)} focusKey={submits + (save.isError ? 1 : 0)} />
          <Field name="title" label="Title" required error={err('title')}><Input {...register('title')} /></Field>
          <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
            <Field name="venue" label="Venue" error={err('venue')}><Input {...register('venue')} /></Field>
            <Field name="city" label="City" error={err('city')}><Input {...register('city')} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
            <Field name="dateLabel" label="Date label" error={err('dateLabel')}><Input {...register('dateLabel')} /></Field>
            <Field name="booth" label="Booth" error={err('booth')}><Input {...register('booth')} /></Field>
          </div>
          <Field name="text" label="Text" error={err('text')}><Textarea rows={6} {...register('text')} /></Field>
          <Field name="slug" label="Slug" error={err('slug')}><PrefixInput prefix="arthouz.com/fairs/" {...register('slug', slugAsUndefined)} /></Field>
        </div>
        <aside className="flex flex-col gap-5 border border-line bg-surface-2 p-4">
          <ImageField label="Image" ratio="3/2" value={image} onChange={pickImage} />
          {fair && (
            <Switch label="Published" checked={fair.isPublished} disabled={isDirty || publish.isPending}
              onChange={(e) => void togglePublish(e.target.checked)} />
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary" disabled={save.isPending}>Save</Button>
            <LinkButton to="/fairs">Cancel</LinkButton>
          </div>
          {fair && <Button variant="danger" onClick={() => setConfirming(true)}>Delete</Button>}
        </aside>
      </form>
      {fair && (
        <ConfirmModal open={confirming} danger busy={remove.isPending} title="Delete this fair?" body={`${fair.title} will be removed from the site. This cannot be undone.`}
          confirmLabel="Delete fair" onConfirm={() => void confirmDelete()} onCancel={() => setConfirming(false)} />
      )}
    </div>
  )
}
