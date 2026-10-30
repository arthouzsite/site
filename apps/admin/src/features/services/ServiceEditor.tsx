import { useState } from 'react'
import { serviceInputSchema } from '@arthouz/shared'
import { useNavigate, useParams } from 'react-router'
import { useBreadcrumb } from '../../app/breadcrumb'
import { PageHead } from '../../components/PageHead'
import { Button, ConfirmModal, ErrorSummary, Field, Icon, Input, LinkButton, PrefixInput, StatusChip, Switch, Textarea, collectErrors } from '../../components/ui'
import { Card } from '../../components/ui/Card'
import { ApiError } from '../../lib/api'
import { useToast } from '../../lib/toast'
import { useZodForm } from '../../lib/useZodForm'
import { ImageField } from '../media/ImageField'
import type { MediaRef } from '../media/types'
import { DEFAULT_CTA_LABEL, serviceUrl, type AdminService } from './types'
import { useDeleteService, usePublishService, useSaveService, useService } from './useServices'

const LABELS = {
  title: 'Title', slug: 'Slug', summary: 'Summary', body: 'Body', ctaLabel: 'CTA label', ctaHref: 'CTA link',
  contactName: 'Contact name', contactPhone: 'Contact phone', contactEmail: 'Contact email', imageId: 'Image',
}
const BODY_ROWS = 14
const SUMMARY_ROWS = 3

export default function ServiceEditor() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const query = useService(isNew ? undefined : id)
  useBreadcrumb(isNew ? 'New service' : query.data?.title ?? (query.isError ? 'Unavailable' : 'Loading…'))
  if (isNew) return <ServiceForm service={null} />
  // Keyed so navigating straight from one service to another remounts the form with the new record.
  if (query.data) return <ServiceForm key={query.data.id} service={query.data} />
  if (query.isError) return <p role="alert" className="m-0 text-13 text-danger">Could not load this service.</p>
  return <p className="m-0 text-13 text-muted">Loading service</p>
}

const trimmedOrUndefined = { setValueAs: (v: unknown) => (typeof v === 'string' ? v.trim() : '') || undefined }

function ServiceForm({ service }: { service: AdminService | null }) {
  const toast = useToast()
  const navigate = useNavigate()
  const save = useSaveService(service?.id)
  const publish = usePublishService()
  const remove = useDeleteService()
  const [image, setImage] = useState<MediaRef | null>(service?.image ?? null)
  const [submits, setSubmits] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const form = useZodForm(serviceInputSchema, {
    slug: service?.slug,
    title: service?.title ?? '',
    summary: service?.summary ?? '',
    body: service?.body ?? '',
    imageId: service?.imageId ?? null,
    ctaLabel: service?.ctaLabel ?? DEFAULT_CTA_LABEL,
    ctaHref: service?.ctaHref ?? '',
    contactName: service?.contactName ?? '',
    contactPhone: service?.contactPhone ?? '',
    contactEmail: service?.contactEmail ?? '',
    isPublished: service?.isPublished ?? false,
  })
  const { register, handleSubmit, formState: { errors, isDirty }, setValue, reset } = form
  const err = (name: keyof typeof LABELS) => errors[name]?.message as string | undefined

  const pickImage = (ref: MediaRef | null) => {
    setImage(ref)
    setValue('imageId', ref?.id ?? null, { shouldDirty: true })
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      // Publishing goes through its own endpoint; the PATCH schema would strip isPublished anyway.
      const payload = service ? Object.fromEntries(Object.entries(values).filter(([key]) => key !== 'isPublished')) : values
      const saved = await save.mutateAsync(payload)
      toast.success(`Saved · ${saved.title}`)
      if (service) reset(values)
      else navigate(`/services/${saved.id}`, { replace: true })
    } catch (e) {
      form.applyServerErrors(e)
    }
  }, () => setSubmits((n) => n + 1))

  const togglePublish = async (isPublished: boolean) => {
    if (!service) return
    try {
      await publish.mutateAsync({ id: service.id, isPublished })
      toast.success(`${isPublished ? 'Published' : 'Unpublished'} · ${service.title}`)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not change publish state')
    }
  }

  const confirmDelete = async () => {
    if (!service) return
    try {
      await remove.mutateAsync(service.id)
      toast.success(`Deleted · ${service.title}`)
      navigate('/services', { replace: true })
    } catch (e) {
      setConfirming(false)
      toast.error(e instanceof ApiError ? e.message : 'Could not delete the service')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={service?.title ?? 'New service'} />
      <form noValidate onSubmit={(e) => void onSubmit(e)} className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-8 max-[1100px]:grid-cols-1">
        <div className="flex min-w-0 flex-col gap-5">
          <ErrorSummary errors={collectErrors(errors, LABELS)} focusKey={submits + (save.isError ? 1 : 0)} />
          <Field name="title" label="Title" required error={err('title')}><Input {...register('title')} /></Field>
          <Field name="slug" label="Slug" error={err('slug')}><PrefixInput prefix="arthouz.com/services/" {...register('slug', trimmedOrUndefined)} /></Field>
          <Field name="summary" label="Summary" error={err('summary')}><Textarea rows={SUMMARY_ROWS} {...register('summary')} /></Field>
          <Field name="body" label="Body" error={err('body')}><Textarea rows={BODY_ROWS} {...register('body')} /></Field>
          <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
            <Field name="ctaLabel" label="CTA label" error={err('ctaLabel')}><Input {...register('ctaLabel')} /></Field>
            <Field name="ctaHref" label="CTA link" help="Leave empty to point at the Visit page" error={err('ctaHref')}><Input {...register('ctaHref')} /></Field>
          </div>
          <Card title="Sales contact">
            <Field name="contactName" label="Name" error={err('contactName')}><Input autoComplete="off" {...register('contactName')} /></Field>
            <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
              <Field name="contactPhone" label="Phone" error={err('contactPhone')}><Input type="tel" autoComplete="off" {...register('contactPhone')} /></Field>
              <Field name="contactEmail" label="Email" error={err('contactEmail')}><Input type="email" autoComplete="off" {...register('contactEmail')} /></Field>
            </div>
          </Card>
        </div>
        <aside className="flex flex-col gap-5">
          <div className="flex flex-col gap-5 border border-line bg-surface-2 p-4">
            <ImageField label="Image" ratio="3/2" value={image} onChange={pickImage} />
          </div>
          <Card title="Publishing">
            <div className="flex items-center justify-between gap-3">
              {service
                ? <Switch label="Published" checked={service.isPublished} disabled={isDirty || publish.isPending} onChange={(e) => void togglePublish(e.target.checked)} />
                : <span className="text-13 text-muted">Save first to publish</span>}
              <StatusChip status={service?.isPublished ? 'live' : 'draft'} />
            </div>
            {service && (
              <a href={serviceUrl(service.slug)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 self-start text-13 underline-offset-2 hover:underline">
                View on site <Icon name="external" />
              </a>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" disabled={save.isPending}>Save</Button>
              <LinkButton to="/services">Cancel</LinkButton>
            </div>
            {service && <Button variant="danger" onClick={() => setConfirming(true)}>Delete</Button>}
          </Card>
        </aside>
      </form>
      {service && (
        <ConfirmModal open={confirming} danger busy={remove.isPending} title="Delete this service?" body={`${service.title} will be removed from the site. This cannot be undone.`}
          confirmLabel="Delete service" onConfirm={() => void confirmDelete()} onCancel={() => setConfirming(false)} />
      )}
    </div>
  )
}
