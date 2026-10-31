import { todayInKolkata } from '@/lib/shared'
import { allowsTestOverrides } from '@/lib/test-overrides'
import { env } from './env'

export function today(): Date {
  if (env.TODAY_OVERRIDE && allowsTestOverrides(env)) {
    return new Date(`${env.TODAY_OVERRIDE}T00:00:00.000Z`)
  }
  return todayInKolkata()
}
