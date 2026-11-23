import { useEffect, useId, useRef, useState } from 'react'
import { printCategoryInputSchema } from '@/lib/shared'
import { Button, ConfirmModal, ErrorSummary, Field, Icon, Input, collectErrors } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { useToast } from '../../lib/toast'
import { useZodForm } from '../../lib/useZodForm'
import type { MediaRef } from '../media/types'
import { PrintImagesField } from './PrintImagesField'
import type { AdminPrintCategory } from './types'
import { useDeletePrintCategory, useSavePrintCategory } from './usePrints'

const LABELS = { name: 'Category name', imageIds: 'Images' }
const NEW_HEADING = 'New category'

type Props = {
  /** Null for an unsaved card; the first save POSTs it. */
  category: AdminPrintCategory | null
  canMoveUp: boolean
  canMoveDown: boolean
  moving: boolean
  onMove: (by: -1 | 1) => void
  /** Called after the first save of an unsaved card so the parent can drop its draft. */
  onSettled: () => void
  onDiscard: () => void
}

export function PrintCategoryCard({ category, canMoveUp, canMoveDown, moving, onMove, onSettled, onDiscard }: Props) {
  const toast = useToast()
  const headingId = useId()
  // Several cards share one page, so each namespaces its field ids.
  const idPrefix = `field-${headingId}`
  const save = useSavePrintCategory(category?.id ?? null)
  const remove = useDeletePrintCategory()
  const [images, setImages] = useState<MediaRef[]>(category?.images ?? [])
  const [confirming, setConfirming] = useState(false)
  const [submits, setSubmits] = useState(0)
  const form = useZodForm(printCategoryInputSchema, {
    slug: category?.slug,
    name: category?.name ?? '',
    imageIds: (category?.images ?? []).map((image) => image.id),
  })
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = form
  // A card the user just added opens with the name focused, so typing can start where the button put them.
  const nameInput = useRef<HTMLInputElement | null>(null)
  const nameField = register('name')
  useEffect(() => {
    if (!category) nameInput.current?.focus()
  }, [category])
  const heading = watch('name')?.trim() || NEW_HEADING
  const err = (name: keyof typeof LABELS) => errors[name]?.message as string | undefined

  const changeImages = (next: MediaRef[]) => {
    setImages(next)
    setValue('imageIds', next.map((image) => image.id), { shouldDirty: true })
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync(values)
      toast.success(`Saved · ${saved.name}`)
      if (category) reset(values)
      else onSettled()
    } catch (e) {
      form.applyServerErrors(e)
    }
  }, () => setSubmits((n) => n + 1))

  const confirmDelete = async () => {
    if (!category) return
    try {
      await remove.mutateAsync(category.id)
      toast.success(`Deleted · ${category.name}`)
    } catch (e) {
      setConfirming(false)
      toast.error(e instanceof ApiError ? e.message : 'Could not delete the category')
    }
  }

  return (
    <section aria-labelledby={headingId} className="border border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line py-1 pl-4 pr-1.5">
        <h2 id={headingId} className="m-0 min-w-0 break-words font-display text-[28px] font-normal leading-none">{heading}</h2>
        <div className="flex shrink-0 gap-0.5">
          <Button variant="ghost" size="sm" iconOnly aria-label={`Move ${heading} up`} disabled={!category || !canMoveUp || moving} onClick={() => onMove(-1)}><Icon name="up" /></Button>
          <Button variant="ghost" size="sm" iconOnly aria-label={`Move ${heading} down`} disabled={!category || !canMoveDown || moving} onClick={() => onMove(1)}><Icon name="down" /></Button>
        </div>
      </div>
      <form noValidate onSubmit={(e) => void onSubmit(e)} aria-label={`${heading} details`} className="flex flex-col gap-4 p-4">
        <ErrorSummary errors={collectErrors(errors, LABELS, `${headingId}-`)} focusKey={submits + (save.isError ? 1 : 0)} />
        <Field name="name" idPrefix={idPrefix} label="Category name" required error={err('name')}>
          <Input {...nameField} ref={(el) => { nameField.ref(el); nameInput.current = el }} />
        </Field>
        <PrintImagesField categoryName={heading} images={images} onChange={changeImages} error={err('imageIds')} />
        <div className="flex flex-wrap justify-between gap-2">
          <Button type="submit" variant="primary" disabled={save.isPending}>Save</Button>
          {category ? <Button variant="danger" onClick={() => setConfirming(true)}>Delete</Button> : <Button onClick={onDiscard}>Discard</Button>}
        </div>
      </form>
      {category && (
        <ConfirmModal open={confirming} danger busy={remove.isPending} title="Delete this category?"
          body={`${category.name} and its place in the Prints menu will be removed from the site. The images stay in the media library. This cannot be undone.`}
          confirmLabel="Delete category" onConfirm={() => void confirmDelete()} onCancel={() => setConfirming(false)} />
      )}
    </section>
  )
}
