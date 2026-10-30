import { Field, Textarea } from '../../components/ui'
import type { ArtistForm } from './artistForm'
import { SectionCard } from './SectionCard'

export function TextCard({ form }: { form: ArtistForm }) {
  const { register, formState: { errors } } = form
  return (
    <SectionCard title="Text">
      <Field name="lede" label="Lede" error={errors.lede?.message}>
        <Textarea rows={2} className="min-h-0 font-display text-[18px] leading-[1.4]" {...register('lede')} />
      </Field>
      <Field name="bio" label="Bio" error={errors.bio?.message}>
        <Textarea rows={10} {...register('bio')} />
      </Field>
    </SectionCard>
  )
}
