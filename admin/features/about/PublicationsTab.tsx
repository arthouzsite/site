import { get } from 'react-hook-form'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { ImageIdField } from '../settings/ImageIdField'
import { useSettingCard, type KeyMap } from '../settings/useSettingCard'
import { AboutSection, type SectionProps } from './AboutSection'

const KEYS: KeyMap = { publications: 'about.publications' }
const URL_ERROR = 'Enter a full web address, starting with https://'

export function PublicationsTab({ settings, active, onDirtyChange }: SectionProps) {
  const card = useSettingCard('about-publications', KEYS, settings)
  const { register, watch, setValue, formState } = card.form
  const urlError = get(formState.errors, 'publications.externalUrl') ? URL_ERROR : undefined
  const errors = card.errors.map((e) => (e.name === 'publications.externalUrl' ? { ...e, message: URL_ERROR } : e))
  return (
    <AboutSection
      id="publications"
      title="Publications"
      card={{ ...card, errors }}
      active={active}
      onDirtyChange={onDirtyChange}
      aside={<ImageIdField label="Image" ratio="3/2" imageId={watch('publications.imageId') as string | null} onChange={(id) => setValue('publications.imageId', id, { shouldDirty: true })} />}
    >
      <Field name="publications.title" label="Title"><Input {...register('publications.title')} /></Field>
      <Field name="publications.body" label="Body"><Textarea rows={8} {...register('publications.body')} /></Field>
      <Field name="publications.externalUrl" label="External URL" help="Shown as ‘View more ↗’" error={urlError}>
        <Input
          type="url"
          placeholder="https://"
          {...register('publications.externalUrl', { setValueAs: (v: string | null) => (v?.trim() ? v.trim() : null) })}
        />
      </Field>
    </AboutSection>
  )
}
