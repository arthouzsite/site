import { useMemo, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { PageHead } from '../../components/PageHead'
import { ArtistIndexCards } from './ArtistIndexCards'
import { ArtistsLineCard } from './ArtistsLineCard'
import { CardRegistryContext, type CardHandle, type CardRegistry } from './cardRegistry'
import { FocusArtistCard } from './FocusArtistCard'
import { FooterCard } from './FooterCard'
import { HeroLayoutCards } from './HeroLayoutCards'
import { SiteCard } from './SiteCard'
import { useCanEditSettings, useSettings } from './useSettings'

export default function SettingsPage() {
  const settings = useSettings()
  const canEdit = useCanEditSettings()
  const handles = useRef(new Map<string, CardHandle>())
  const [dirty, setDirty] = useState<ReadonlySet<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const registry = useMemo<CardRegistry>(
    () => ({
      setHandle: (id, handle) => {
        if (handle) handles.current.set(id, handle)
        else handles.current.delete(id)
      },
      setDirty: (id, isDirty) =>
        setDirty((cur) => {
          if (cur.has(id) === isDirty) return cur
          const next = new Set(cur)
          if (isDirty) next.add(id)
          else next.delete(id)
          return next
        }),
    }),
    [],
  )

  const saveAll = async () => {
    setSaving(true)
    try {
      for (const id of dirty) await handles.current.get(id)?.save()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHead title="Home & settings" />
      {settings.isError && <p role="alert" className="m-0 text-13 text-danger">Could not load settings. Reload the page.</p>}
      {settings.data && (
        <CardRegistryContext.Provider value={registry}>
          <div className="flex max-w-[920px] flex-col gap-6">
            {!canEdit && <p className="m-0 text-13 text-muted">Only administrators can change these settings.</p>}
            <HeroLayoutCards settings={settings.data} readOnly={!canEdit} />
            <FocusArtistCard settings={settings.data} readOnly={!canEdit} />
            <ArtistsLineCard settings={settings.data} readOnly={!canEdit} />
            <ArtistIndexCards settings={settings.data} readOnly={!canEdit} />
            <FooterCard settings={settings.data} readOnly={!canEdit} />
            <SiteCard settings={settings.data} readOnly={!canEdit} />
            {canEdit && (
              <div className="sticky bottom-0 -mx-1 flex justify-end border-t border-line bg-bg px-1 py-3">
                <Button variant="primary" disabled={dirty.size === 0 || saving} onClick={() => void saveAll()}>Save settings</Button>
              </div>
            )}
          </div>
        </CardRegistryContext.Provider>
      )}
    </>
  )
}
