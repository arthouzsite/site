'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { RouterProvider } from 'react-router'
import { createAppRouter } from './app/router'
import { createQueryClient } from './lib/queryClient'
import { ToastProvider } from './lib/toast'

/** The whole CMS: providers plus the React Router tree, created once per mount (client-only, see app/admin). */
export default function AdminApp() {
  const [queryClient] = useState(createQueryClient)
  const [router] = useState(() => createAppRouter())

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  )
}
