import { todayInKolkata } from '@arthouz/shared'
import { env } from './env'

export function today(): Date {
  if (env.TODAY_OVERRIDE && env.NODE_ENV !== 'production') {
    return new Date(`${env.TODAY_OVERRIDE}T00:00:00.000Z`)
  }
  return todayInKolkata()
}
