import { z } from 'zod'
import { forbidden } from '@/lib/server/http/errors'
import { parseBody } from '@/lib/server/http/parse'
import { route } from '@/lib/server/http/route'
import { settingsService } from '@/lib/server/settings/settings.service'

const EDITOR_KEY_PREFIX = 'about.'
const FORBIDDEN_MESSAGE = 'You do not have permission to do that'
const settingBodySchema = z.object({ value: z.unknown() })

type Params = { key: string }

export const GET = route<Params>('user', ({ params }) => settingsService.get(settingsService.parseKey(params.key)))

/** About-page content belongs to editors; every other setting is administrator-only. */
export const PUT = route<Params>('user', async ({ params, request, user }) => {
  const { value } = await parseBody(request, settingBodySchema)
  if (!params.key.startsWith(EDITOR_KEY_PREFIX) && user?.role !== 'ADMIN') throw forbidden(FORBIDDEN_MESSAGE)
  return settingsService.set(settingsService.parseKey(params.key), value)
})
