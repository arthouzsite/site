'use client'

import type { PublicAbout } from '@arthouz/shared'
import { usePathname, useRouter } from 'next/navigation'
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

/** Tab strip (URL state `?tab=`) over the active about panel. */
export function AboutTabs({ about, tab }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const select = (key: AboutTabKey) => router.replace(key === DEFAULT_ABOUT_TAB ? pathname : `${pathname}?tab=${key}`, { scroll: false })
  return (
    <>
      <div role="tablist" aria-label="About" className="mb-[clamp(40px,5vw,72px)] flex flex-wrap gap-x-7 border-b border-line-18">
        {ABOUT_TABS.map(({ key, label }) => {
          const active = key === tab
          return (
            <button
              key={key}
              id={`about-tab-${key}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="about-panel"
              onClick={() => select(key)}
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
