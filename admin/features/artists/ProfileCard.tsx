import { slugify } from '@/lib/shared'
import { forwardRef, useEffect, useState, type InputHTMLAttributes } from 'react'
import { Field, Input } from '../../components/ui'
import type { ArtistForm } from './artistForm'
import { SectionCard } from './SectionCard'

const SlugInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function SlugInput(props, ref) {
  return (
    <div className="flex h-11 items-center border border-line-strong bg-surface-2 hover:border-ink focus-within:border-ink">
      <span className="flex h-full items-center border-r border-line bg-surface px-2.5 text-13 text-faint">arthouz.com/artists/</span>
      <input ref={ref} className="h-full min-w-0 flex-1 bg-transparent px-3 text-14 text-ink" {...props} />
    </div>
  )
})

type Props = { form: ArtistForm; isNew: boolean }

export function ProfileCard({ form, isNew }: Props) {
  const { register, watch, setValue, formState: { errors } } = form
  const [slugEdited, setSlugEdited] = useState(false)
  const name = watch('name') ?? ''
  const slug = register('slug')

  // A new artist's slug follows the name until the editor types their own.
  useEffect(() => {
    if (isNew && !slugEdited) setValue('slug', slugify(name))
  }, [isNew, slugEdited, name, setValue])

  return (
    <SectionCard title="Profile">
      <Field name="name" label="Name" required error={errors.name?.message}>
        <Input className="h-14 font-display text-[28px]" {...register('name')} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="sortName" label="Sort name" help="Controls the A–Z letter and ordering. Defaults to the name." error={errors.sortName?.message}>
          <Input placeholder={name} {...register('sortName')} />
        </Field>
        <Field name="slug" label="Slug" error={errors.slug?.message}>
          <SlugInput {...slug} onChange={(e) => { setSlugEdited(true); void slug.onChange(e) }} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_180px]">
        <Field name="medium" label="Medium" error={errors.medium?.message}>
          <Input {...register('medium')} />
        </Field>
        <Field name="base" label="Base / lives and works in" error={errors.base?.message}>
          <Input {...register('base')} />
        </Field>
        <Field name="born" label="Born (optional)" error={errors.born?.message}>
          <Input inputMode="numeric" {...register('born')} />
        </Field>
      </div>
    </SectionCard>
  )
}
