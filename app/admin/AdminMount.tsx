'use client'

import dynamic from 'next/dynamic'

// The CMS reads window, document and the session cookie: it is client-rendered only. `ssr: false` is allowed
// in client components only, hence this wrapper between the server page and the app.
const AdminApp = dynamic(() => import('@/admin/AdminApp'), { ssr: false })

export function AdminMount() {
  return <AdminApp />
}
