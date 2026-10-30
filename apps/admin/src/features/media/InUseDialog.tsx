import { Button, Dialog } from '../../components/ui'
import type { MediaUsage } from './types'

type Props = { open: boolean; fileName: string; usedBy: MediaUsage[]; onClose: () => void }

export function InUseDialog({ open, fileName, usedBy, onClose }: Props) {
  return (
    <Dialog
      open={open}
      role="alertdialog"
      title="This image is in use"
      onClose={onClose}
      footer={<Button variant="primary" data-autofocus onClick={onClose}>Close</Button>}
    >
      <p className="m-0 mb-3">
        {fileName} is used in {usedBy.length} {usedBy.length === 1 ? 'place' : 'places'}. Replace it there first, then delete it here.
      </p>
      <UsageList usedBy={usedBy} />
    </Dialog>
  )
}

export function UsageList({ usedBy }: { usedBy: MediaUsage[] }) {
  return (
    <ul className="m-0 list-none p-0">
      {usedBy.map((u) => (
        <li key={`${u.type}:${u.id}`} className="flex min-h-11 flex-col justify-center border-b border-line py-1.5">
          <span className="text-14 text-ink">{u.title}</span>
          <span className="text-12 capitalize text-muted">{u.type}</span>
        </li>
      ))}
    </ul>
  )
}
