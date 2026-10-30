import { useState } from 'react'
import { newsInputSchema } from '@arthouz/shared'
import { useNavigate, useParams } from 'react-router'
import { PageHead } from '../../components/PageHead'
import { Button, ConfirmModal, ErrorSummary, Field, Input, LinkButton, PrefixInput, Switch, Textarea, collectErrors } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { useToast } from '../../lib/toast'
import { useZodForm } from '../../lib/useZodForm'
import { ImageField } from '../media/ImageField'
import type { MediaRef } from '../media/types'
import { ExhibitionSelect } from './ExhibitionSelect'
import { MonthYearFields } from './MonthYearFields'
import { firstOfMonth, type AdminNews } from './types'
import { useDeleteNews, useNewsItem, usePublishNews, useSaveNews } from './useNews'

const LABELS = { title: 'Title', excerpt: 'Excerpt', publishedAt: 'Published on', externalUrl: 'External article URL', exhibitionId: 'Linked exhibition', slug: 'Slug' }

export default function NewsEditorPage() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const query = useNewsItem(isNew ? undefined : id)
  if (isNew) return <NewsForm item={null} />
  if (query.isError) return <p role="alert" className="m-0 text-13 text-danger">Could not load this news item.</p>
  if (!query.data) return <p className="m-0 text-13 text-muted">Loading news item</p>
  return <NewsForm item={query.data} />
}

function NewsForm({ item }: { item: AdminNews | null }) {
  const toast = useToast()
  const navigate = useNavigate()
  const save = useSaveNews(item?.id)
  const publish = usePublishNews()
  const remove = useDeleteNews()
  const [image, setImage] = useState<MediaRef | null>(item?.image ?? null)
  const [exhibition, setExhibition] = useState(item?.exhibition ?? null)
  const [submits, setSubmits] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const now = new Date()
  const form = useZodForm(newsInputSchema, {
    slug: item?.slug,
    title: item?.title ?? '',
    excerpt: item?.excerpt ?? '',
    publishedAt: item?.publishedAt ?? firstOfMonth(now.getUTCFullYear(), now.getUTCMonth()),
    imageId: item?.imageId ?? null,
    externalUrl: item?.externalUrl ?? null,
    exhibitionId: item?.exhibitionId ?? null,
    isPublished: item?.isPublished ?? false,
  })
  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isDirty } } = form
  const publishedAt = String(watch('publishedAt'))
  const err = (name: keyof typeof LABELS) => errors[name]?.message as string | undefined

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync({ ...values, publishedAt: new Date(values.publishedAt as string | Date) })
      toast.success(`Saved · ${saved.title}`)
      if (item) reset(values)
      else navigate(`/news/${saved.id}`, { replace: true })
    } catch (e) {
      form.applyServerErrors(e)
    }
  }, () => setSubmits((n) => n + 1))

  const togglePublish = async (isPublished: boolean) => {
    if (!item) return
    try {
      await publish.mutateAsync({ id: item.id, isPublished })
      toast.success(`${isPublished ? 'Published' : 'Unpublished'} · ${item.title}`)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not change publish state')
    }
  }

  const confirmDelete = async () => {
    if (!item) return
    try {
      await remove.mutateAsync(item.id)
      toast.success(`Deleted · ${item.title}`)
      navigate('/news', { replace: true })
    } catch (e) {
      setConfirming(false)
      toast.error(e instanceof ApiError ? e.message : 'Could not delete the news item')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={item?.title ?? 'New news item'} />
      <form noValidate onSubmit={(e) => void onSubmit(e)} className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-8 max-[1100px]:grid-cols-1">
        <div className="flex min-w-0 flex-col gap-5">
          <ErrorSummary errors={collectErrors(errors, LABELS)} focusKey={submits + (save.isError ? 1 : 0)} />
          <Field name="title" label="Title" required error={err('title')}><Textarea rows={2} className="min-h-0 font-display text-26 leading-[1.15]" {...register('title')} /></Field>
          <Field name="excerpt" label="Excerpt" error={err('excerpt')}><Textarea rows={4} {...register('excerpt')} /></Field>
          <MonthYearFields value={publishedAt} onChange={(iso) => setValue('publishedAt', iso, { shouldDirty: true })} error={err('publishedAt')} />
          <Field name="externalUrl" label="External article URL" help="Shown as ‘Read article ↗’" error={err('externalUrl')}>
            <Input type="url" {...register('externalUrl', { setValueAs: (v: unknown) => (typeof v === 'string' ? v.trim() : '') || null })} />
          </Field>
          <Field name="exhibitionId" label="Linked exhibition" error={err('exhibitionId')}
            help={exhibition ? 'Adds ‘View exhibition →’ and lists this item under Press on the exhibition page' : undefined}>
            <ExhibitionSelect value={exhibition} onChange={(opt) => {
              setExhibition(opt)
              setValue('exhibitionId', opt?.id ?? null, { shouldDirty: true })
            }} />
          </Field>
          <Field name="slug" label="Slug" error={err('slug')}>
            <PrefixInput prefix="arthouz.com/news/" {...register('slug', { setValueAs: (v: unknown) => (typeof v === 'string' ? v.trim() : '') || undefined })} />
          </Field>
        </div>
        <aside className="flex flex-col gap-5 border border-line bg-surface-2 p-4">
          <ImageField label="Image" ratio="4/3" value={image} onChange={(ref) => {
            setImage(ref)
            setValue('imageId', ref?.id ?? null, { shouldDirty: true })
          }} />
          {item && <Switch label="Published" checked={item.isPublished} disabled={isDirty || publish.isPending} onChange={(e) => void togglePublish(e.target.checked)} />}
          {item && isDirty && <p className="m-0 text-12 text-muted">Save your changes to use the publish switch.</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary" disabled={save.isPending}>Save</Button>
            <LinkButton to="/news">Cancel</LinkButton>
          </div>
          {item && <Button variant="danger" onClick={() => setConfirming(true)}>Delete</Button>}
        </aside>
      </form>
      {item && (
        <ConfirmModal open={confirming} danger busy={remove.isPending} title="Delete this news item?" body={`${item.title} will be removed from the site. This cannot be undone.`}
          confirmLabel="Delete news item" onConfirm={() => void confirmDelete()} onCancel={() => setConfirming(false)} />
      )}
    </div>
  )
}
