import { Button, Icon, ImageSlot } from '../../components/ui'
import type { Artwork } from './types'

type Props = {
  work: Artwork
  index: number
  count: number
  busy: boolean
  onEdit: () => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
}

export function WorkCard({ work, index, count, busy, onEdit, onRemove, onMove }: Props) {
  const meta = [work.year, work.medium, work.size].filter(Boolean).join(' · ')
  return (
    <li className="group/work flex min-w-0 flex-col">
      <ImageSlot
        ratio="1/1"
        src={work.image?.url}
        alt={work.image?.alt || work.title}
        placeholder="No image"
        overlay={
          <>
            <Button size="sm" variant="onDark" aria-label={`Edit ${work.title}`} onClick={onEdit}>Edit</Button>
            <Button size="sm" variant="onDark" aria-label={`Remove ${work.title}`} onClick={onRemove}>Remove</Button>
          </>
        }
      />
      <div className="flex items-start gap-1.5 pt-2.5">
        <div className="min-w-0 flex-1">
          <div className="font-display text-17 italic leading-tight">{work.title}</div>
          {meta && <div className="mt-0.5 text-12 text-muted">{meta}</div>}
        </div>
        <span className="flex gap-0.5 opacity-55 transition-opacity group-focus-within/work:opacity-100 group-hover/work:opacity-100">
          <Button variant="ghost" size="sm" iconOnly aria-label={`Move ${work.title} earlier`} disabled={busy || index === 0} onClick={() => onMove(-1)}>
            <Icon name="up" />
          </Button>
          <Button variant="ghost" size="sm" iconOnly aria-label={`Move ${work.title} later`} disabled={busy || index === count - 1} onClick={() => onMove(1)}>
            <Icon name="down" />
          </Button>
        </span>
      </div>
    </li>
  )
}
