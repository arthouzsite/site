import { useState } from 'react'
import { PRINT_CATEGORIES_MAX } from '@/lib/shared'
import { PageHead } from '../../components/PageHead'
import { Button, Icon } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { useToast } from '../../lib/toast'
import { PrintCategoryCard } from './PrintCategoryCard'
import { usePrintCategories, useReorderPrintCategories } from './usePrints'

const LIMIT_MESSAGE = `Prints holds at most ${PRINT_CATEGORIES_MAX} categories`

function move(ids: string[], index: number, by: -1 | 1): string[] {
  const next = [...ids]
  const [item] = next.splice(index, 1)
  next.splice(index + by, 0, item!)
  return next
}

export default function PrintsPage() {
  const toast = useToast()
  const list = usePrintCategories()
  const reorder = useReorderPrintCategories()
  // Unsaved cards, identified by a local counter until their first save lands.
  const [drafts, setDrafts] = useState<number[]>([])
  const [nextDraft, setNextDraft] = useState(1)
  const categories = list.data ?? []
  const ids = categories.map((c) => c.id)

  const reorderBy = async (index: number, by: -1 | 1) => {
    try {
      await reorder.mutateAsync(move(ids, index, by))
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not reorder categories')
    }
  }
  const dropDraft = (key: number) => setDrafts((cur) => cur.filter((k) => k !== key))
  // A new card opens at the top, next to the button that created it.
  const addDraft = () => {
    if (categories.length + drafts.length >= PRINT_CATEGORIES_MAX) return toast.error(LIMIT_MESSAGE)
    setDrafts((cur) => [nextDraft, ...cur])
    setNextDraft((n) => n + 1)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Prints" actions={<Button variant="primary" onClick={addDraft}><Icon name="plus" />Add category</Button>} />
      {list.isError && <p role="alert" className="m-0 text-13 text-danger">Could not load print categories. Try again.</p>}
      {list.data && categories.length === 0 && drafts.length === 0 && <p className="m-0 text-13 text-muted">No categories yet.</p>}
      {list.data && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))] items-start gap-6">
          {drafts.map((key) => (
            <PrintCategoryCard key={`draft-${key}`} category={null} canMoveUp={false} canMoveDown={false} moving={false}
              onMove={() => undefined} onSettled={() => dropDraft(key)} onDiscard={() => dropDraft(key)} />
          ))}
          {categories.map((category, i) => (
            <PrintCategoryCard key={category.id} category={category} canMoveUp={i > 0} canMoveDown={i < categories.length - 1} moving={reorder.isPending}
              onMove={(by) => void reorderBy(i, by)} onSettled={() => undefined} onDiscard={() => undefined} />
          ))}
        </div>
      )}
    </div>
  )
}
