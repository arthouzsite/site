import { useState } from 'react'
import { Button, Dialog, Icon, Pager, Tabs } from '../../components/ui'
import { panelId, tabId } from '../../components/ui/Tabs'
import { MediaGrid } from './MediaGrid'
import { toMediaRef, type Media, type MediaRef } from './types'
import { UploadQueue } from './UploadQueue'
import { useDebouncedValue } from './useDebouncedValue'
import { useMediaList } from './useMedia'

const PAGE_SIZE = 12
const SEARCH_DEBOUNCE_MS = 250
const TABS = [
  { id: 'library', label: 'Library' },
  { id: 'upload', label: 'Upload' },
]

type Props = { open: boolean; onClose: () => void; onSelect: (ref: MediaRef) => void }

export function MediaPicker({ open, onClose, onSelect }: Props) {
  const [tab, setTab] = useState('library')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Media | null>(null)
  const q = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS)
  const list = useMediaList({ q, page, missingAlt: false, limit: PAGE_SIZE })
  const missingAlt = selected !== null && selected.alt.trim() === ''

  const confirm = () => {
    if (selected && !missingAlt) onSelect(toMediaRef(selected))
  }

  return (
    <Dialog
      open={open}
      title="Choose image"
      onClose={onClose}
      width="w-[min(880px,calc(100vw-32px))]"
      footer={
        <>
          {missingAlt && <p role="alert" className="m-0 mr-auto flex items-center gap-1.5 text-12 text-danger"><Icon name="alert" />This image has no alt text. Add it in Media first.</p>}
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!selected || missingAlt} onClick={confirm}>Use this image</Button>
        </>
      }
    >
      <Tabs tabs={TABS} value={tab} onChange={setTab} label="Image source">
        <div role="tabpanel" id={panelId(tab)} aria-labelledby={tabId(tab)} className="flex flex-col gap-4 pt-4">
          {tab === 'library' ? (
            <>
              <div className="relative">
                <label htmlFor="picker-q" className="sr-only">Search by file name or alt text</label>
                <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  id="picker-q"
                  type="search"
                  value={search}
                  placeholder="Search by file name or alt text"
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="h-11 w-full rounded-xs border border-line-strong bg-surface-2 pl-9 pr-3 text-14 text-ink placeholder:text-faint hover:border-ink focus:border-ink"
                />
              </div>
              {list.isError && <p role="alert" className="m-0 text-13 text-danger">Could not load the library.</p>}
              {list.data && list.data.items.length === 0 && <p className="m-0 text-13 text-muted">No images match.</p>}
              {list.data && list.data.items.length > 0 && (
                <MediaGrid items={list.data.items} selectedId={selected?.id ?? null} onSelect={setSelected} label="Images" />
              )}
              {list.data && <Pager page={page} limit={PAGE_SIZE} total={list.data.total} onPage={setPage} />}
            </>
          ) : (
            <UploadQueue onUploaded={(media) => { setSelected(media); setTab('library') }} />
          )}
        </div>
      </Tabs>
    </Dialog>
  )
}
