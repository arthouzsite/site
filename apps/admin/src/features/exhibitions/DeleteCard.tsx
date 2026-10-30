import { useState } from 'react'
import { Button, ConfirmModal, Icon } from '../../components/ui'
import { FormCard } from './FormCard'
import { exhibitionUrl } from './types'

type Props = { title: string; slug: string; busy: boolean; onDelete: () => void }

export function DeleteCard({ title, slug, busy, onDelete }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <FormCard title="Danger zone" danger>
      <Button variant="danger" className="self-start" onClick={() => setOpen(true)}>
        <Icon name="trash" /> Delete exhibition
      </Button>
      <ConfirmModal
        open={open}
        title={`Delete ${title}?`}
        body={`The exhibition page at ${exhibitionUrl(slug).replace(/^https?:\/\//, '')} goes offline and its artist and work links are removed. Artists, works and the hero image stay in the CMS.`}
        confirmLabel="Delete exhibition"
        danger
        busy={busy}
        onConfirm={onDelete}
        onCancel={() => setOpen(false)}
      />
    </FormCard>
  )
}
