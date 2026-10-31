import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router'
import { PageHead } from '../../components/PageHead'
import { Tabs } from '../../components/ui/Tabs'
import { useSettings } from '../settings/useSettings'
import { GalleryTab } from './GalleryTab'
import { ProprietorTab } from './ProprietorTab'
import { PublicationsTab } from './PublicationsTab'
import { ServicesTab } from './ServicesTab'

const TABS = [
  { id: 'gallery', label: 'Gallery' },
  { id: 'proprietor', label: 'Proprietor' },
  { id: 'services', label: 'Services' },
  { id: 'publications', label: 'Publications' },
]
const DEFAULT_TAB = 'gallery'

export default function AboutPage() {
  const settings = useSettings()
  const [params, setParams] = useSearchParams()
  const [dirty, setDirty] = useState<Readonly<Record<string, boolean>>>({})
  const requested = params.get('tab') ?? DEFAULT_TAB
  const tab = TABS.some((t) => t.id === requested) ? requested : DEFAULT_TAB

  const markDirty = useCallback(
    (id: string, isDirty: boolean) => setDirty((cur) => (cur[id] === isDirty ? cur : { ...cur, [id]: isDirty })),
    [],
  )

  const tabs = TABS.map((t) => ({ ...t, unsaved: Boolean(dirty[t.id]) }))
  const data = settings.data
  return (
    <>
      <PageHead title="About page" />
      {settings.isError && <p role="alert" className="m-0 text-13 text-danger">Could not load the About page. Reload the page.</p>}
      {data && (
        <Tabs tabs={tabs} value={tab} label="About sections" onChange={(id) => setParams({ tab: id }, { replace: true })}>
          <GalleryTab settings={data} active={tab === 'gallery'} onDirtyChange={markDirty} />
          <ProprietorTab settings={data} active={tab === 'proprietor'} onDirtyChange={markDirty} />
          <ServicesTab settings={data} active={tab === 'services'} onDirtyChange={markDirty} />
          <PublicationsTab settings={data} active={tab === 'publications'} onDirtyChange={markDirty} />
        </Tabs>
      )}
    </>
  )
}
