import { createBrowserRouter, type RouteObject } from 'react-router'
import { AppShell } from './AppShell'
import { RequireAuth } from './RequireAuth'
import { RequireRole } from './RequireRole'

type Page = { default: React.ComponentType }
const page = (load: () => Promise<Page>): Pick<RouteObject, 'lazy'> => ({
  lazy: async () => ({ Component: (await load()).default }),
})

export const routes: RouteObject[] = [
  { path: '/login', ...page(() => import('../features/auth/LoginPage')) },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, ...page(() => import('../features/dashboard/DashboardPage')) },
          { path: 'exhibitions', ...page(() => import('../features/exhibitions/ExhibitionsListPage.placeholder')) },
          { path: 'exhibitions/new', ...page(() => import('../features/exhibitions/ExhibitionEditPage.placeholder')) },
          { path: 'exhibitions/:id', ...page(() => import('../features/exhibitions/ExhibitionEditPage.placeholder')) },
          { path: 'artists', ...page(() => import('../features/artists/ArtistsListPage.placeholder')) },
          { path: 'artists/new', ...page(() => import('../features/artists/ArtistEditPage.placeholder')) },
          { path: 'artists/:id', ...page(() => import('../features/artists/ArtistEditPage.placeholder')) },
          { path: 'fairs', ...page(() => import('../features/fairs/FairsListPage.placeholder')) },
          { path: 'fairs/:id', ...page(() => import('../features/fairs/FairEditPage.placeholder')) },
          { path: 'news', ...page(() => import('../features/news/NewsListPage.placeholder')) },
          { path: 'news/:id', ...page(() => import('../features/news/NewsEditPage.placeholder')) },
          { path: 'locations', ...page(() => import('../features/locations/LocationsPage.placeholder')) },
          { path: 'about', ...page(() => import('../features/about/AboutPage')) },
          { path: 'settings', ...page(() => import('../features/settings/SettingsPage')) },
          { path: 'media', ...page(() => import('../features/media/MediaPage')) },
          {
            element: <RequireRole allow="ADMIN" />,
            children: [{ path: 'users', ...page(() => import('../features/users/UsersPage')) }],
          },
        ],
      },
    ],
  },
]

export const createAppRouter = () => createBrowserRouter(routes)
