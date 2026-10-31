import { MAX_HOME_ARTIST_COUNT } from '@/lib/shared'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { SettingCardShell } from './SettingCardShell'
import type { SettingsMap } from './useSettings'
import { useSettingCard, type KeyMap } from './useSettingCard'

const KEYS: KeyMap = { homeArtistCount: 'homeArtistCount' }
const COUNT_ERROR = `Enter a whole number from 1 to ${MAX_HOME_ARTIST_COUNT}.`

type Props = { settings: Partial<SettingsMap>; readOnly: boolean }

export function ArtistsLineCard({ settings, readOnly }: Props) {
  const card = useSettingCard('artists-line', KEYS, settings)
  const { register, formState } = card.form
  const invalid = Boolean(formState.errors.homeArtistCount)
  // The shared schema decides validity; its raw zod wording is replaced with a plain sentence.
  const errors = card.errors.map((e) => (e.name === 'homeArtistCount' ? { ...e, message: COUNT_ERROR } : e))

  return (
    <SettingCardShell title="Artists line on home" card={{ ...card, errors }} readOnly={readOnly}>
      <Field name="homeArtistCount" label="Number of artists" help="Alphabetical by sort name" error={invalid ? COUNT_ERROR : undefined}>
        <Input type="number" min={1} max={MAX_HOME_ARTIST_COUNT} className="max-w-[140px]" {...register('homeArtistCount', { valueAsNumber: true })} />
      </Field>
    </SettingCardShell>
  )
}
