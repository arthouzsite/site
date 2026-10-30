import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { SESSION_KEY, useSession } from '../features/auth/useSession'
import { SESSION_EXPIRED_EVENT } from '../lib/api'

export function RequireAuth() {
  const { user, isLoading } = useSession()
  const client = useQueryClient()
  const location = useLocation()

  useEffect(() => {
    const onExpired = () => client.setQueryData(SESSION_KEY, null)
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  }, [client])

  if (isLoading) {
    return (
      <div role="status" aria-busy="true" className="grid min-h-screen place-items-center bg-bg text-12 uppercase tracking-eyebrow text-muted">
        Loading
      </div>
    )
  }
  if (!user) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  return <Outlet />
}
