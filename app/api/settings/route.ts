import { route } from '@/lib/server/http/route'
import { settingsService } from '@/lib/server/settings/settings.service'

export const GET = route('user', () => settingsService.getAll())
