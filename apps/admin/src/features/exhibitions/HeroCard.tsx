import { FormCard } from './FormCard'
import { ImageField } from '../media/ImageField'
import type { MediaRef } from '../media/types'

type Props = { value: MediaRef | null; onChange: (value: MediaRef | null) => void }

export function HeroCard({ value, onChange }: Props) {
  return (
    <FormCard title="Hero image">
      <ImageField label="Hero image" ratio="3/2" value={value} onChange={onChange} />
    </FormCard>
  )
}
