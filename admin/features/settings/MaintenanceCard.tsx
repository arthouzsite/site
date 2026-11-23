import { Switch } from '../../components/ui/Switch'
import { SettingCardShell } from './SettingCardShell'
import type { SettingsMap } from './useSettings'
import { useSettingCard, type KeyMap } from './useSettingCard'

const KEYS: KeyMap = { maintenance: 'maintenance' }

type Props = { settings: Partial<SettingsMap>; readOnly: boolean }

/** Closes the public site behind the maintenance screen; the CMS itself stays open. */
export function MaintenanceCard({ settings, readOnly }: Props) {
  const card = useSettingCard('maintenance', KEYS, settings)
  return (
    <SettingCardShell title="Maintenance break" card={card} readOnly={readOnly}>
      <Switch label="Show the maintenance screen on the public site" {...card.form.register('maintenance.isEnabled')} />
    </SettingCardShell>
  )
}
