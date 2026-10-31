'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

const ADMIN_PREFIX = '/admin'

/** The CMS under /admin is a separate app with its own shell: the public header and footer are not rendered around it. */
const isAdminPath = (pathname: string) => pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`)

type Props = { header: ReactNode; footer: ReactNode; children: ReactNode }

export function SiteChrome({ header, footer, children }: Props) {
  if (isAdminPath(usePathname())) return <>{children}</>
  return (
    <>
      {header}
      {children}
      {footer}
    </>
  )
}
