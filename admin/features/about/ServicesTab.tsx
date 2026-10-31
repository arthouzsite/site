import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { ImageIdField } from '../settings/ImageIdField'
import { useSettingCard, type KeyMap } from '../settings/useSettingCard'
import { AboutSection, type SectionProps } from './AboutSection'

const KEYS: KeyMap = { services: 'about.services' }

export function ServicesTab({ settings, active, onDirtyChange }: SectionProps) {
  const card = useSettingCard('about-services', KEYS, settings)
  const { register, watch, setValue } = card.form
  return (
    <AboutSection
      id="services"
      title="Services"
      card={card}
      active={active}
      onDirtyChange={onDirtyChange}
      aside={<ImageIdField label="Image" ratio="3/2" imageId={watch('services.imageId') as string | null} onChange={(id) => setValue('services.imageId', id, { shouldDirty: true })} />}
    >
      <Field name="services.title" label="Title"><Input {...register('services.title')} /></Field>
      <Field name="services.body" label="Body"><Textarea rows={6} {...register('services.body')} /></Field>
      <Field name="services.ctaLabel" label="CTA label" help="Links to Visit"><Input {...register('services.ctaLabel')} /></Field>
    </AboutSection>
  )
}
