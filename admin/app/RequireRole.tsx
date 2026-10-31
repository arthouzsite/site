import { Navigate, Outlet } from 'react-router'
import { useSession, type SessionUser } from '../features/auth/useSession'

export function RequireRole({ allow }: { allow: SessionUser['role'] }) {
  const { user } = useSession()
  if (user?.role !== allow) return <Navigate to="/" replace />
  return <Outlet />
}
