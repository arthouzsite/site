import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { ImageIdField } from './ImageIdField'
import { SettingCardShell } from './SettingCardShell'
import type { SettingsMap } from './useSettings'
import { useArtistOptions } from './useOptions'
import { useSettingCard, type KeyMap } from './useSettingCard'

const KEYS: KeyMap = { homeFocus: 'homeFocus' }

type Props = { settings: Partial<SettingsMap>; readOnly: boolean }

export function FocusArtistCard({ settings, readOnly }: Props) {
  const card = useSettingCard('focus', KEYS, settings)
  const { form } = card
  const artists = useArtistOptions()
  const artistId = (form.watch('homeFocus.artistId') as string | null) ?? ''
  const imageId = form.watch('homeFocus.imageId') as string | null

  return (
    <SettingCardShell title="Artist in focus" card={card} readOnly={readOnly}>
      <Field name="homeFocus.artistId" label="Artist">
        <Select value={artistId} onChange={(e) => form.setValue('homeFocus.artistId', e.target.value || null, { shouldDirty: true })}>
          <option value="">None</option>
          {artists.data?.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="homeFocus.mediumLabel" label="Medium label"><Input {...form.register('homeFocus.mediumLabel')} /></Field>
        <Field name="homeFocus.baseLabel" label="Base label"><Input {...form.register('homeFocus.baseLabel')} /></Field>
      </div>
      <Field name="homeFocus.text" label="Text"><Textarea rows={4} {...form.register('homeFocus.text')} /></Field>
      <div className="w-[200px] max-w-full">
        <ImageIdField label="Image" ratio="1/1" imageId={imageId} onChange={(id) => form.setValue('homeFocus.imageId', id, { shouldDirty: true })} />
      </div>
    </SettingCardShell>
  )
}
