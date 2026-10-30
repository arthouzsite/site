import { get } from 'react-hook-form'
import { Field } from '../../components/ui/Field'
import { Input } from '../../components/ui/Input'
import { SettingCardShell } from './SettingCardShell'
import type { SettingsMap } from './useSettings'
import { useSettingCard, type KeyMap } from './useSettingCard'

const KEYS: KeyMap = { footer: 'footer' }

type Props = { settings: Partial<SettingsMap>; readOnly: boolean }

export function FooterCard({ settings, readOnly }: Props) {
  const card = useSettingCard('footer', KEYS, settings)
  const { register, watch, formState } = card.form
  const from = watch('footer.copyrightFrom') as number
  const year = new Date().getFullYear()
  const fromError = get(formState.errors, 'footer.copyrightFrom') ? 'Enter a four-digit year.' : undefined
  const errors = card.errors.map((e) => (e.name === 'footer.copyrightFrom' ? { ...e, message: 'Enter a four-digit year.' } : e))

  return (
    <SettingCardShell title="Footer" card={{ ...card, errors }} readOnly={readOnly}>
      <Field name="footer.tagline" label="Tagline"><Input {...register('footer.tagline')} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="footer.instagramUrl" label="Instagram URL"><Input type="url" {...register('footer.instagramUrl')} /></Field>
        <Field name="footer.facebookUrl" label="Facebook URL"><Input type="url" {...register('footer.facebookUrl')} /></Field>
      </div>
      <Field name="footer.copyrightFrom" label="Copyright from year" help={`Renders as © ${Number.isFinite(from) ? from : ''} – ${year}`} error={fromError}>
        <Input type="number" className="max-w-[140px]" {...register('footer.copyrightFrom', { valueAsNumber: true })} />
      </Field>
    </SettingCardShell>
  )
}
