import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@/styles/admin.css'

export const metadata: Metadata = {
  title: { absolute: 'Art Houz CMS' },
  robots: { index: false, follow: false },
  icons: { icon: ['/admin/favicon.svg', '/admin/favicon-32.png'], apple: '/admin/apple-touch-icon.png' },
}

/**
 * The root layout already provides <html>, <body> and the site fonts (app/fonts.ts, next/font/google: EB Garamond,
 * Space Grotesk, Noto Serif Tamil); the CMS reuses them through the CSS variables set on <html>.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="admin-root">{children}</div>
}
