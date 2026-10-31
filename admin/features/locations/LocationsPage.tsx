import { useState } from 'react'
import { PageHead } from '../../components/PageHead'
import { Button, Icon } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { useToast } from '../../lib/toast'
import { LocationCard } from './LocationCard'
import { useLocations, useReorderLocations } from './useLocations'

const APPEARS_IN = ['Home → Galleries section', 'Visit page', 'Footer hours']

function move(ids: string[], index: number, by: -1 | 1): string[] {
  const next = [...ids]
  const [item] = next.splice(index, 1)
  next.splice(index + by, 0, item!)
  return next
}

export default function LocationsPage() {
  const toast = useToast()
  const list = useLocations()
  const reorder = useReorderLocations()
  // Unsaved cards, identified by a local counter until their first save lands.
  const [drafts, setDrafts] = useState<number[]>([])
  const [nextDraft, setNextDraft] = useState(1)
  const locations = list.data ?? []
  const ids = locations.map((l) => l.id)

  const reorderBy = async (index: number, by: -1 | 1) => {
    try {
      await reorder.mutateAsync(move(ids, index, by))
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not reorder locations')
    }
  }
  const dropDraft = (key: number) => setDrafts((cur) => cur.filter((k) => k !== key))
  const addDraft = () => {
    setDrafts((cur) => [...cur, nextDraft])
    setNextDraft((n) => n + 1)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Locations" actions={<Button variant="primary" onClick={addDraft}><Icon name="plus" />Add location</Button>} />
      {list.isError && <p role="alert" className="m-0 text-13 text-danger">Could not load locations. Try again.</p>}
      {list.data && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))] items-start gap-6">
          {locations.map((loc, i) => (
            <LocationCard key={loc.id} location={loc} canMoveUp={i > 0} canMoveDown={i < locations.length - 1} moving={reorder.isPending}
              onMove={(by) => void reorderBy(i, by)} onSettled={() => undefined} onDiscard={() => undefined} />
          ))}
          {drafts.map((key) => (
            <LocationCard key={`draft-${key}`} location={null} canMoveUp={false} canMoveDown={false} moving={false}
              onMove={() => undefined} onSettled={() => dropDraft(key)} onDiscard={() => dropDraft(key)} />
          ))}
        </div>
      )}
      <section aria-labelledby="where-h" className="flex flex-col gap-2.5">
        <h2 id="where-h" className="m-0 border-b border-line pb-2 text-12 font-medium uppercase tracking-eyebrow text-body">Where locations appear</h2>
        <ul className="m-0 flex list-none flex-col gap-1 p-0 text-13 text-muted">
          {APPEARS_IN.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </section>
    </div>
  )
}
