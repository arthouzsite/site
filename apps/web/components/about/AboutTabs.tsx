'use client'

import type { PublicAbout } from '@arthouz/shared'
import { usePathname, useRouter } from 'next/navigation'
import { useState, type KeyboardEvent } from 'react'
import { GalleryTab } from './GalleryTab'
import { ProprietorTab } from './ProprietorTab'
import { PublicationsTab } from './PublicationsTab'
import { ServicesTab } from './ServicesTab'
import { ABOUT_TABS, DEFAULT_ABOUT_TAB, type AboutTabKey } from './tabs'

function Panel({ tab, about }: { tab: AboutTabKey; about: PublicAbout }) {
  switch (tab) {
    case 'proprietor':
      return <ProprietorTab proprietor={about.proprietor} />
    case 'services':
      return <ServicesTab services={about.services} />
    case 'publications':
      return <PublicationsTab publications={about.publications} />
    default:
      return <GalleryTab gallery={about.gallery} />
  }
}

type Props = { about: PublicAbout; tab: AboutTabKey }

const LAST_INDEX = ABOUT_TABS.length - 1

/** Index the arrow/Home/End key moves to from `index`, or null for keys the tablist ignores. */
function targetIndex(key: string, index: number): number | null {
  switch (key) {
    case 'ArrowRight':
      return index === LAST_INDEX ? 0 : index + 1
    case 'ArrowLeft':
      return index === 0 ? LAST_INDEX : index - 1
    case 'Home':
      return 0
    case 'End':
      return LAST_INDEX
    default:
      return null
  }
}

/** Tab strip (URL state `?tab=`) over the active about panel; local state makes the switch instant, the URL follows. */
export function AboutTabs({ about, tab: urlTab }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [tab, setTab] = useState(urlTab)
  const [seenUrlTab, setSeenUrlTab] = useState(urlTab)
  if (urlTab !== seenUrlTab) {
    setSeenUrlTab(urlTab)
    setTab(urlTab)
  }
  const select = (key: AboutTabKey) => {
    setTab(key)
    router.replace(key === DEFAULT_ABOUT_TAB ? pathname : `${pathname}?tab=${key}`, { scroll: false })
  }
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = targetIndex(event.key, index)
    const target = next === null ? undefined : ABOUT_TABS[next]
    if (!target) return
    event.preventDefault()
    document.getElementById(`about-tab-${target.key}`)?.focus()
    select(target.key)
  }
  return (
    <>
      <div role="tablist" aria-label="About" className="mb-[clamp(40px,5vw,72px)] flex flex-wrap gap-x-7 border-b border-line-18">
        {ABOUT_TABS.map(({ key, label }, index) => {
          const active = key === tab
          return (
            <button
              key={key}
              id={`about-tab-${key}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="about-panel"
              tabIndex={active ? 0 : -1}
              onClick={() => select(key)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={`-mb-px h-12 cursor-pointer border-0 border-b-2 border-solid bg-transparent p-0 font-ui text-[12.5px] tracking-[0.16em] uppercase ${active ? 'border-amber text-ink' : 'border-transparent text-muted'}`}
            >
              {label}
            </button>
          )
        })}
      </div>
      <div role="tabpanel" id="about-panel" aria-labelledby={`about-tab-${tab}`}>
        <Panel tab={tab} about={about} />
      </div>
    </>
  )
}
