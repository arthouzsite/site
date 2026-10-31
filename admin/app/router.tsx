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
          { path: 'exhibitions', ...page(() => import('../features/exhibitions/ExhibitionsListPage')) },
          { path: 'exhibitions/new', ...page(() => import('../features/exhibitions/ExhibitionEditorPage')) },
          { path: 'exhibitions/:id', ...page(() => import('../features/exhibitions/ExhibitionEditorPage')) },
          { path: 'artists', ...page(() => import('../features/artists/ArtistsListPage')) },
          { path: 'artists/new', ...page(() => import('../features/artists/ArtistEditorPage')) },
          { path: 'artists/:id', ...page(() => import('../features/artists/ArtistEditorPage')) },
          { path: 'fairs', ...page(() => import('../features/fairs/FairsPage')) },
          { path: 'fairs/new', ...page(() => import('../features/fairs/FairEditor')) },
          { path: 'fairs/:id', ...page(() => import('../features/fairs/FairEditor')) },
          { path: 'services', ...page(() => import('../features/services/ServicesPage')) },
          { path: 'services/new', ...page(() => import('../features/services/ServiceEditor')) },
          { path: 'services/:id', ...page(() => import('../features/services/ServiceEditor')) },
          { path: 'news', ...page(() => import('../features/news/NewsListPage')) },
          { path: 'news/new', ...page(() => import('../features/news/NewsEditorPage')) },
          { path: 'news/:id', ...page(() => import('../features/news/NewsEditorPage')) },
          { path: 'locations', ...page(() => import('../features/locations/LocationsPage')) },
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
