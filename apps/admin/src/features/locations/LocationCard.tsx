import { useId, useState } from 'react'
import { locationInputSchema } from '@arthouz/shared'
import { Button, ConfirmModal, ErrorSummary, Icon, Input, PrefixInput, Textarea, collectErrors } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { useToast } from '../../lib/toast'
import { useZodForm } from '../../lib/useZodForm'
import { ImageField } from '../media/ImageField'
import type { MediaRef } from '../media/types'
import { LocationField as Field } from './LocationField'
import type { AdminLocation } from './types'
import { useDeleteLocation, useSaveLocation } from './useLocations'

const LABELS = { city: 'City', address: 'Address', phone: 'Phone', tel: 'Tel', days: 'Days', hours: 'Hours', mapUrl: 'Google Maps URL' }

type Props = {
  /** Null for an unsaved card; the first save POSTs it. */
  location: AdminLocation | null
  canMoveUp: boolean
  canMoveDown: boolean
  moving: boolean
  onMove: (by: -1 | 1) => void
  /** Called after a successful save or delete of an unsaved card so the parent can drop its draft. */
  onSettled: () => void
  onDiscard: () => void
}

export function LocationCard({ location, canMoveUp, canMoveDown, moving, onMove, onSettled, onDiscard }: Props) {
  const toast = useToast()
  const headingId = useId()
  const save = useSaveLocation(location?.id ?? null)
  const remove = useDeleteLocation()
  const [image, setImage] = useState<MediaRef | null>(location?.image ?? null)
  const [confirming, setConfirming] = useState(false)
  const [submits, setSubmits] = useState(0)
  const form = useZodForm(locationInputSchema, {
    slug: location?.slug,
    city: location?.city ?? '',
    address: location?.address ?? '',
    phone: location?.phone ?? '',
    tel: location?.tel ?? '',
    days: location?.days ?? '',
    hours: location?.hours ?? '',
    mapUrl: location?.mapUrl ?? '',
    imageId: location?.imageId ?? null,
    sortOrder: location?.sortOrder ?? 0,
  })
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = form
  const city = watch('city')
  const mapUrl = watch('mapUrl')
  const err = (name: keyof typeof LABELS) => errors[name]?.message as string | undefined
  const heading = city?.trim() || 'New location'

  const pickImage = (ref: MediaRef | null) => {
    setImage(ref)
    setValue('imageId', ref?.id ?? null, { shouldDirty: true })
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync(values)
      toast.success(`Saved · ${saved.city}`)
      if (location) reset(values)
      else onSettled()
    } catch (e) {
      form.applyServerErrors(e)
    }
  }, () => setSubmits((n) => n + 1))

  const confirmDelete = async () => {
    if (!location) return
    try {
      await remove.mutateAsync(location.id)
      toast.success(`Deleted · ${location.city}`)
    } catch (e) {
      setConfirming(false)
      toast.error(e instanceof ApiError ? e.message : 'Could not delete the location')
    }
  }

  return (
    <section aria-labelledby={headingId} className="border border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line py-1 pl-4 pr-1.5">
        <h2 id={headingId} className="m-0 font-display text-[28px] font-normal leading-none">{heading}</h2>
        <div className="flex gap-0.5">
          <Button variant="ghost" size="sm" iconOnly aria-label={`Move ${heading} up`} disabled={!location || !canMoveUp || moving} onClick={() => onMove(-1)}><Icon name="up" /></Button>
          <Button variant="ghost" size="sm" iconOnly aria-label={`Move ${heading} down`} disabled={!location || !canMoveDown || moving} onClick={() => onMove(1)}><Icon name="down" /></Button>
        </div>
      </div>
      <form noValidate onSubmit={(e) => void onSubmit(e)} aria-label={`${heading} details`} className="flex flex-col gap-4 p-4">
        <ErrorSummary errors={collectErrors(errors, LABELS, `${headingId}-`)} focusKey={submits + (save.isError ? 1 : 0)} />
        <ImageField label="Image" ratio="4/3" value={image} onChange={pickImage} />
        <Field name="city" idPrefix={headingId} label="City" required error={err('city')}><Input {...register('city')} /></Field>
        <Field name="address" idPrefix={headingId} label="Address" error={err('address')}><Textarea rows={2} className="min-h-0" {...register('address')} /></Field>
        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <Field name="phone" idPrefix={headingId} label="Phone" error={err('phone')}><Input {...register('phone')} /></Field>
          <Field name="tel" idPrefix={headingId} label="Tel" help="E.164, used for the call link" error={err('tel')}><PrefixInput prefix="tel:" type="tel" {...register('tel')} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <Field name="days" idPrefix={headingId} label="Days" error={err('days')}><Input {...register('days')} /></Field>
          <Field name="hours" idPrefix={headingId} label="Hours" error={err('hours')}><Input {...register('hours')} /></Field>
        </div>
        <div className="flex flex-col gap-1.5">
          {mapUrl && (
            <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center self-end text-12 text-body underline">Test ↗</a>
          )}
          <Field name="mapUrl" idPrefix={headingId} label="Google Maps URL" error={err('mapUrl')}><Input type="url" {...register('mapUrl')} /></Field>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <Button type="submit" variant="primary" disabled={save.isPending}>Save</Button>
          {location ? <Button variant="danger" onClick={() => setConfirming(true)}>Delete</Button> : <Button onClick={onDiscard}>Discard</Button>}
        </div>
      </form>
      {location && (
        <ConfirmModal open={confirming} danger busy={remove.isPending} title="Delete this location?" body={`${location.city} will be removed from the site. This cannot be undone.`}
          confirmLabel="Delete location" onConfirm={() => void confirmDelete()} onCancel={() => setConfirming(false)} />
      )}
    </section>
  )
}
