import { route } from '@/lib/server/http/route'

export const GET = route('public', () => ({ status: 'ok' }))
