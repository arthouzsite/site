import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { ImageIdField } from './ImageIdField'
import { SettingCardShell } from './SettingCardShell'
import type { SettingsMap } from './useSettings'
import { useSettingCard, type KeyMap } from './useSettingCard'

const KEYS: KeyMap = { site: 'site' }

type Props = { settings: Partial<SettingsMap>; readOnly: boolean }

export function SiteCard({ settings, readOnly }: Props) {
  const card = useSettingCard('site', KEYS, settings)
  const { form } = card
  return (
    <SettingCardShell title="Site" card={card} readOnly={readOnly}>
      <Field name="site.title" label="Title"><Input {...form.register('site.title')} /></Field>
      <Field name="site.description" label="Description"><Textarea rows={3} {...form.register('site.description')} /></Field>
      <div className="w-[240px] max-w-full">
        <ImageIdField
          label="Social share image"
          ratio="3/2"
          imageId={form.watch('site.ogImageId') as string | null}
          onChange={(id) => form.setValue('site.ogImageId', id, { shouldDirty: true })}
        />
      </div>
    </SettingCardShell>
  )
}
