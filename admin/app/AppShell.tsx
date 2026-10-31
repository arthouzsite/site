import { Outlet } from 'react-router'
import { useSession } from '../features/auth/useSession'
import { Sidebar } from './Sidebar'
import { BreadcrumbProvider } from './breadcrumb'
import { Topbar } from './Topbar'

export function AppShell() {
  const { user, logout } = useSession()
  if (!user) return null // RequireAuth guarantees a user; this keeps the type narrow.
  return (
    <BreadcrumbProvider>
      <div className="app-shell">
        <Sidebar user={user} />
        <div className="flex min-w-0 flex-col">
          <Topbar user={user} onLogout={logout} />
          <main className="flex flex-col gap-6 px-[var(--gutter)] pb-16 pt-7 max-sm:pb-24">
            <Outlet />
          </main>
        </div>
      </div>
    </BreadcrumbProvider>
  )
}
