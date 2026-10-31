import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { requireActor } from '@/lib/server/users/actor'
import { userUpdateSchema } from '@/lib/server/users/user-update.schema'
import * as users from '@/lib/server/users/users.service'

type Params = { id: string }

export const PATCH = route<Params>('admin', async ({ params, request, user }) =>
  users.update(params.id, await parseBody(request, userUpdateSchema), requireActor(user).id),
)

export const DELETE = route<Params>('admin', ({ params, user }) => users.remove(params.id, requireActor(user).id))
