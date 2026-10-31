import type { ReactNode } from 'react'
import { RadioCards } from '../../components/ui/RadioCards'
import { SettingCardShell } from './SettingCardShell'
import type { SettingsMap } from './useSettings'
import { useSettingCard, type KeyMap } from './useSettingCard'

const KEYS: KeyMap = { artistIndexLayout: 'artistIndexLayout' }
const bars = (count: number, className: string): ReactNode =>
  Array.from({ length: count }, (_, i) => <b key={i} className={`absolute h-1.5 bg-ink opacity-80 ${className}`} style={{ top: 8 + i * 8 }} />)
const LAYOUTS = [
  { value: 'GROUPED', name: 'Grouped A–Z', preview: <span aria-hidden="true" className="absolute inset-0 block">{bars(7, 'left-3 w-[30%]')}</span> },
  { value: 'FLOWING', name: 'Flowing', preview: <span aria-hidden="true" className="absolute inset-0 block">{bars(5, 'left-3 w-[70%]')}</span> },
]

type Props = { settings: Partial<SettingsMap>; readOnly: boolean }

export function ArtistIndexCards({ settings, readOnly }: Props) {
  const card = useSettingCard('artist-index', KEYS, settings)
  return (
    <SettingCardShell title="Artists page" card={card} readOnly={readOnly}>
      <RadioCards
        label="Index layout"
        options={LAYOUTS}
        value={card.form.watch('artistIndexLayout') as string}
        onChange={(v) => card.form.setValue('artistIndexLayout', v, { shouldDirty: true })}
      />
    </SettingCardShell>
  )
}
