import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '../../components/ui'
import { FormCard } from './FormCard'
import { LinkNewsDialog } from './LinkNewsDialog'
import { useNewsList } from './useNewsLinks'

export function PressCard({ exhibitionId, title }: { exhibitionId: string | undefined; title: string }) {
  const [open, setOpen] = useState(false)
  const news = useNewsList()
  const all = exhibitionId ? (news.data ?? []) : []
  const linked = all.filter((n) => n.exhibition?.id === exhibitionId)

  return (
    <FormCard title="Press" actions={<Button size="sm" disabled={!exhibitionId} onClick={() => setOpen(true)}>Link news</Button>}>
      {!exhibitionId && <p className="m-0 text-13 text-muted">Save the exhibition to link news.</p>}
      {exhibitionId && linked.length === 0 && <p className="m-0 text-13 text-muted">No news is linked to {title || 'this exhibition'} yet.</p>}
      {linked.length > 0 && (
        <ul className="m-0 list-none border-t border-line p-0">
          {linked.map((n) => (
            <li key={n.id} className="flex min-h-12 items-center border-b border-line">
              <Link to={`/news/${n.id}`} className="py-2 text-14 underline-offset-2 hover:underline">{n.title}</Link>
            </li>
          ))}
        </ul>
      )}
      {exhibitionId && <LinkNewsDialog open={open} onClose={() => setOpen(false)} exhibitionId={exhibitionId} news={all} />}
    </FormCard>
  )
}
