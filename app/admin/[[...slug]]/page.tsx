import { AdminMount } from '../AdminMount'

/** One optional catch-all serves /admin and every deep link below it; React Router resolves the path in the browser. */
export default function AdminPage() {
  return <AdminMount />
}
