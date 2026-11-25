import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { MaintenanceScreen } from '@/components/site/MaintenanceScreen'
import { SiteFrame } from '@/components/site/SiteFrame'
import { isUnderMaintenance } from '@/lib/maintenance'
import { loadSiteMetadata } from '@/lib/site-metadata'

/** The home page keeps its normal metadata during a maintenance break, so it stays in search results. */
export function generateMetadata(): Promise<Metadata> {
  return loadSiteMetadata()
}

/**
 * The home page alone: during a maintenance break it is replaced by the maintenance screen, without the site
 * header and footer. Every other public page stays open in app/(site).
 */
export default async function HomeLayout({ children }: { children: ReactNode }) {
  if (await isUnderMaintenance()) return <MaintenanceScreen />
  return <SiteFrame>{children}</SiteFrame>
}
