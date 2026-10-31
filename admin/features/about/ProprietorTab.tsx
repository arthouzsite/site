import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { ImageIdField } from '../settings/ImageIdField'
import { useSettingCard, type KeyMap } from '../settings/useSettingCard'
import { AboutSection, type SectionProps } from './AboutSection'

const KEYS: KeyMap = { proprietor: 'about.proprietor' }

export function ProprietorTab({ settings, active, onDirtyChange }: SectionProps) {
  const card = useSettingCard('about-proprietor', KEYS, settings)
  const { register, watch, setValue } = card.form
  return (
    <AboutSection
      id="proprietor"
      title="Proprietor"
      card={card}
      active={active}
      onDirtyChange={onDirtyChange}
      aside={<ImageIdField label="Image" ratio="4/5" imageId={watch('proprietor.imageId') as string | null} onChange={(id) => setValue('proprietor.imageId', id, { shouldDirty: true })} />}
    >
      <Field name="proprietor.eyebrow" label="Eyebrow label"><Input {...register('proprietor.eyebrow')} /></Field>
      <Field name="proprietor.name" label="Name"><Input {...register('proprietor.name')} /></Field>
      <Field name="proprietor.quote" label="Quote"><Textarea rows={4} {...register('proprietor.quote')} /></Field>
      <Field name="proprietor.body" label="Body"><Textarea rows={12} {...register('proprietor.body')} /></Field>
    </AboutSection>
  )
}
