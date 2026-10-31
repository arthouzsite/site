import { route } from '@/lib/server/http/route'

export const GET = route('user', ({ user }) => user)
