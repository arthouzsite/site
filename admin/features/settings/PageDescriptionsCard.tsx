import { DESCRIBED_PAGES, PAGE_DESCRIPTION_MAX } from '@/lib/shared'
import { Field } from '../../components/ui/Field'
import { Textarea } from '../../components/ui/Textarea'
import { SettingCardShell } from './SettingCardShell'
import type { SettingsMap } from './useSettings'
import { useSettingCard, type KeyMap } from './useSettingCard'

const KEYS: KeyMap = { pageDescriptions: 'pageDescriptions' }

type Props = { settings: Partial<SettingsMap>; readOnly: boolean }

/** One description per section page; the site shows it under the page title. */
export function PageDescriptionsCard({ settings, readOnly }: Props) {
  const card = useSettingCard('pageDescriptions', KEYS, settings)
  return (
    <SettingCardShell title="Page descriptions" card={card} readOnly={readOnly}>
      {DESCRIBED_PAGES.map(({ page, label }) => (
        <Field key={page} name={`pageDescriptions.${page}`} label={label}>
          <Textarea rows={3} maxLength={PAGE_DESCRIPTION_MAX} {...card.form.register(`pageDescriptions.${page}`)} />
        </Field>
      ))}
    </SettingCardShell>
  )
}
