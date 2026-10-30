import { Button, Dialog } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { useToast } from '../../lib/toast'
import type { NewsLink } from './types'
import { useLinkNews } from './useNewsLinks'

type Props = { open: boolean; onClose: () => void; exhibitionId: string; news: NewsLink[] }

export function LinkNewsDialog({ open, onClose, exhibitionId, news }: Props) {
  const link = useLinkNews(exhibitionId)
  const toast = useToast()
  const available = news.filter((n) => n.exhibition?.id !== exhibitionId)

  const run = async (item: NewsLink) => {
    try {
      await link.mutateAsync(item.id)
      toast.success(`Linked · ${item.title}`)
      onClose()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not link this news item. Try again.')
    }
  }

  return (
    <Dialog open={open} title="Link news" onClose={onClose} width="w-[min(560px,calc(100vw-32px))]" footer={<Button onClick={onClose}>Close</Button>}>
      {available.length === 0 && <p className="m-0 text-13 text-muted">Every news item is already linked.</p>}
      <ul className="m-0 list-none p-0">
        {available.map((n) => (
          <li key={n.id} className="flex min-h-12 items-center gap-3 border-b border-line py-1.5">
            <span className="min-w-0 flex-1">
              <span className="block truncate">{n.title}</span>
              {n.exhibition && <span className="text-12 text-muted">Currently linked to {n.exhibition.title}</span>}
            </span>
            <Button size="sm" aria-label={`Link ${n.title}`} disabled={link.isPending} onClick={() => run(n)}>Link</Button>
          </li>
        ))}
      </ul>
    </Dialog>
  )
}
