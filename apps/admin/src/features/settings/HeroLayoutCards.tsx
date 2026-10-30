import type { ReactNode } from 'react'
import { Field } from '../../components/ui/Field'
import { RadioCards } from '../../components/ui/RadioCards'
import { Select } from '../../components/ui/Select'
import { SettingCardShell } from './SettingCardShell'
import type { SettingsMap } from './useSettings'
import { useExhibitionOptions } from './useOptions'
import { useSettingCard, type KeyMap } from './useSettingCard'

const KEYS: KeyMap = { heroLayout: 'heroLayout', homeHeroExhibitionId: 'homeHeroExhibitionId' }
const AUTOMATIC = 'Automatic — most recent now on view'

const bar = 'absolute h-1.5 bg-ink opacity-80'
const sketch = (children: ReactNode) => <span aria-hidden="true" className="absolute inset-0 block">{children}</span>
const FULL_BLEED = sketch(
  <>
    <i className="absolute inset-0 bg-img-ph" />
    <b className={`${bar} bottom-3.5 left-3 w-[45%]`} />
    <b className={`${bar} bottom-2 left-3 w-[25%]`} />
  </>,
)
const SPLIT = sketch(
  <>
    <b className={`${bar} left-3 top-5 w-[30%]`} />
    <b className={`${bar} left-3 top-8 w-[20%]`} />
    <b className={`${bar} left-3 top-11 w-[26%]`} />
    <i className="absolute inset-y-0 right-0 w-1/2 bg-img-ph" />
  </>,
)
const LAYOUTS = [
  { value: 'FULL_BLEED', name: 'Full-bleed', preview: FULL_BLEED },
  { value: 'SPLIT', name: 'Split', preview: SPLIT },
]

type Props = { settings: Partial<SettingsMap>; readOnly: boolean }

export function HeroLayoutCards({ settings, readOnly }: Props) {
  const card = useSettingCard('hero', KEYS, settings)
  const { form } = card
  const exhibitions = useExhibitionOptions()
  const layout = form.watch('heroLayout') as string
  const heroId = (form.watch('homeHeroExhibitionId') as string | null) ?? ''

  return (
    <SettingCardShell title="Home hero" card={card} readOnly={readOnly}>
      <RadioCards
        label="Hero layout"
        options={LAYOUTS}
        value={layout}
        onChange={(v) => form.setValue('heroLayout', v, { shouldDirty: true })}
      />
      <Field name="homeHeroExhibitionId" label="Hero exhibition">
        <Select
          value={heroId}
          onChange={(e) => form.setValue('homeHeroExhibitionId', e.target.value || null, { shouldDirty: true })}
        >
          <option value="">{AUTOMATIC}</option>
          {exhibitions.data?.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </Select>
      </Field>
    </SettingCardShell>
  )
}
