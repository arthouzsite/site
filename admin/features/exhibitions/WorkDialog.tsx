import { exhibitionWorkInputSchema } from '@/lib/shared'
import { useState } from 'react'
import { z } from 'zod'
import { Button, Dialog, Field, Icon, Input, Select } from '../../components/ui'
import { useToast } from '../../lib/toast'
import { useZodForm } from '../../lib/useZodForm'
import { ImageField } from '../media/ImageField'
import type { MediaRef } from '../media/types'
import { messageFor } from './formErrors'
import type { ArtistLite } from './types'
import { useAddWork } from './useExhibitionWorks'

const FORM_ID = 'work-form'
/** The dialog opens over the exhibition form, which owns the default `field-*` ids. */
const ID_PREFIX = 'exhibition-work'
const schema = exhibitionWorkInputSchema.extend({ year: z.string().trim().regex(/^(\d{4})?$/, 'Enter a 4-digit year') })
const DEFAULTS = { imageId: '', title: '', year: '', artistId: '', medium: '' }
const PROMPTS = { imageId: 'Choose an image', title: 'Enter a title', artistId: 'Choose an artist' }

type Props = { open: boolean; onClose: () => void; exhibitionId: string; artists: ArtistLite[] }

export function WorkDialog({ open, onClose, exhibitionId, artists }: Props) {
  const form = useZodForm(schema, DEFAULTS)
  const { register, handleSubmit, setValue, reset, formState: { errors } } = form
  const [image, setImage] = useState<MediaRef | null>(null)
  const add = useAddWork(exhibitionId)
  const toast = useToast()
  const serverError = errors.root?.server?.message

  const close = () => {
    reset(DEFAULTS)
    setImage(null)
    onClose()
  }

  const submit = handleSubmit(async (values) => {
    try {
      await add.mutateAsync({ ...values, medium: values.medium ?? '' })
      toast.success(`Added work · ${values.title}`)
      close()
    } catch (err) {
      form.applyServerErrors(err)
    }
  })

  const err = (name: keyof typeof PROMPTS) => messageFor(errors[name], PROMPTS[name])

  return (
    <Dialog
      open={open}
      title="Add work"
      onClose={close}
      width="w-[min(560px,calc(100vw-32px))]"
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" type="submit" form={FORM_ID} disabled={add.isPending}>Add work</Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit} noValidate className="flex flex-col gap-4">
        {serverError && <p role="alert" className="m-0 flex items-center gap-1.5 text-13 text-danger"><Icon name="alert" />{serverError}</p>}
        <div className="flex flex-col gap-1.5">
          <ImageField
            label="Image"
            ratio="4/3"
            value={image}
            onChange={(ref) => { setImage(ref); setValue('imageId', ref?.id ?? '', { shouldValidate: Boolean(errors.imageId) }) }}
          />
          {err('imageId') && <p className="m-0 flex items-center gap-1.5 text-12 text-danger"><Icon name="alert" />{err('imageId')}</p>}
        </div>
        <Field idPrefix={ID_PREFIX} name="title" label="Title" required error={err('title')}>
          <Input {...register('title')} data-autofocus />
        </Field>
        <div className="grid grid-cols-[1fr_2fr] gap-4">
          <Field idPrefix={ID_PREFIX} name="year" label="Year" error={errors.year?.message}>
            <Input {...register('year')} inputMode="numeric" maxLength={4} placeholder="2026" />
          </Field>
          <Field idPrefix={ID_PREFIX} name="medium" label="Medium" error={errors.medium?.message}>
            <Input {...register('medium')} />
          </Field>
        </div>
        <Field idPrefix={ID_PREFIX} name="artistId" label="Artist" required error={err('artistId')}>
          <Select {...register('artistId')}>
            <option value="">Choose artist</option>
            {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </Field>
      </form>
    </Dialog>
  )
}
