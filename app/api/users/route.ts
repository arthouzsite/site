import { userInputSchema } from '@/lib/shared'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import * as users from '@/lib/server/users/users.service'

export const GET = route('admin', () => users.list())

export const POST = route('admin', async ({ request }) => users.create(await parseBody(request, userInputSchema)), { status: 201 })
