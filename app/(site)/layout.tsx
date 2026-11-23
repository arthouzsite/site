import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { MaintenanceScreen } from '@/components/site/MaintenanceScreen'
import { SiteFrame } from '@/components/site/SiteFrame'
import { isUnderMaintenance } from '@/lib/maintenance'
import { loadSiteMetadata } from '@/lib/site-metadata'

/** While the site is closed its pages all show the same screen, so search engines are asked not to index them. */
export async function generateMetadata(): Promise<Metadata> {
  const [metadata, isClosed] = await Promise.all([loadSiteMetadata(), isUnderMaintenance()])
  return isClosed ? { ...metadata, robots: { index: false, follow: false } } : metadata
}

/**
 * Everything public (site pages, their error and not-found boundaries) sits inside the header and footer; /admin
 * does not. During a maintenance break the whole public site is replaced by one screen.
 */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  if (await isUnderMaintenance()) return <MaintenanceScreen />
  return <SiteFrame>{children}</SiteFrame>
}
