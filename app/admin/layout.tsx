import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { fontVariables } from '../fonts'
import '@/styles/admin.css'

export const metadata: Metadata = {
  title: { absolute: 'Art Houz CMS' },
  robots: { index: false, follow: false },
  icons: { icon: ['/admin/favicon.svg', '/admin/favicon-32.png'], apple: '/admin/apple-touch-icon.png' },
}

/**
 * The root layout already provides <html>, <body> and the site fonts (app/fonts.ts, next/font/google: EB Garamond,
 * Space Grotesk, Noto Serif Tamil). Reusing them avoids registering the same faces twice; the variables are set again
 * here so the wrapper does not depend on where the fonts are applied.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className={`admin-root ${fontVariables}`}>{children}</div>
}
