import { slugify } from '@/lib/shared'
import { useEffect, useRef } from 'react'
import { Field, Input, Select } from '../../components/ui'
import { FormCard } from './FormCard'
import { FIELD_PROMPTS, undefinedIfBlank, type ExhibitionZodForm } from './formValues'
import { messageFor } from './formErrors'

const SLUG_PREFIX = 'arthouz.com/exhibitions/'

type Props = { form: ExhibitionZodForm; isNew: boolean }

export function DetailsCard({ form, isNew }: Props) {
  const { register, watch, setValue, formState: { errors } } = form
  const slugEdited = useRef(false)
  const title = watch('title')
  const err = (name: 'title' | 'city' | 'country') => messageFor(errors[name], FIELD_PROMPTS[name]!)

  // On create the slug follows the title until the editor types their own.
  useEffect(() => {
    if (isNew && !slugEdited.current) setValue('slug', slugify(title) || undefined)
  }, [isNew, title, setValue])

  const slug = register('slug', { setValueAs: undefinedIfBlank })

  return (
    <FormCard title="Details">
      <Field name="title" label="Title" required error={err('title')}>
        <Input {...register('title')} className="h-14! text-26! font-display" />
      </Field>
      <Field name="subtitle" label="Subtitle" error={errors.subtitle?.message}>
        <Input {...register('subtitle')} />
      </Field>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <Field name="type" label="Type">
          <Select {...register('type')}>
            <option value="SOLO">Solo</option>
            <option value="GROUP">Group</option>
          </Select>
        </Field>
        <Field name="city" label="City" required error={err('city')}>
          <Input {...register('city')} />
        </Field>
        <Field name="country" label="Country" required error={err('country')}>
          <Input {...register('country')} />
        </Field>
      </div>
      <Field name="venue" label="Venue" error={errors.venue?.message}>
        <Input {...register('venue')} />
      </Field>
      <Field name="slug" label="Slug" help="Changing the slug changes the page address." error={errors.slug?.message}>
        <SlugInput registration={slug} onEdit={() => { slugEdited.current = true }} />
      </Field>
    </FormCard>
  )
}

type SlugProps = {
  registration: ReturnType<ExhibitionZodForm['register']>
  onEdit: () => void
  id?: string
} & Record<string, unknown>

/** Field clones id/aria props onto its child, so the prefix wrapper forwards them to the input. */
function SlugInput({ registration, onEdit, id, ...aria }: SlugProps) {
  return (
    <div className="flex h-11 items-stretch rounded-xs border border-line-strong bg-surface-2 focus-within:border-ink hover:border-ink">
      <span className="grid place-items-center border-r border-line px-3 text-13 text-muted">{SLUG_PREFIX}</span>
      <input
        {...aria}
        id={id}
        {...registration}
        onChange={(e) => { onEdit(); return registration.onChange(e) }}
        className="min-w-0 flex-1 bg-transparent px-3 text-14 text-ink"
      />
    </div>
  )
}
