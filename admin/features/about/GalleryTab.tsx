import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { ImageIdField } from '../settings/ImageIdField'
import { useSettingCard, type KeyMap } from '../settings/useSettingCard'
import { AboutSection, type SectionProps } from './AboutSection'

const KEYS: KeyMap = { gallery: 'about.gallery' }

export function GalleryTab({ settings, active, onDirtyChange }: SectionProps) {
  const card = useSettingCard('about-gallery', KEYS, settings)
  const { register, watch, setValue } = card.form
  return (
    <AboutSection
      id="gallery"
      title="Gallery"
      card={card}
      active={active}
      onDirtyChange={onDirtyChange}
      aside={<ImageIdField label="Image" ratio="4/3" imageId={watch('gallery.imageId') as string | null} onChange={(id) => setValue('gallery.imageId', id, { shouldDirty: true })} />}
    >
      <Field name="gallery.statement" label="Statement"><Textarea rows={2} {...register('gallery.statement')} /></Field>
      <Field name="gallery.body" label="Body"><Textarea rows={10} {...register('gallery.body')} /></Field>
      <Field name="gallery.locationsLabel" label="Locations link label" help="Links to Visit"><Input {...register('gallery.locationsLabel')} /></Field>
    </AboutSection>
  )
}
