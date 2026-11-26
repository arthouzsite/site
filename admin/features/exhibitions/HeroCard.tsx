import { FormCard } from './FormCard'
import { ImageField } from '../media/ImageField'
import type { MediaRef } from '../media/types'

/** The exhibition page shows the whole image; the lists crop it to 3:2. */
const HERO_HELP = 'Best at 2400 × 1600 px (3:2). The exhibition page shows the whole image, uncropped.'

type Props = { value: MediaRef | null; onChange: (value: MediaRef | null) => void }

export function HeroCard({ value, onChange }: Props) {
  return (
    <FormCard title="Hero image">
      <ImageField label="Hero image" ratio="3/2" value={value} onChange={onChange} help={HERO_HELP} />
    </FormCard>
  )
}
