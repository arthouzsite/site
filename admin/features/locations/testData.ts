import type { AdminLocation } from './types'

export function makeLocation(over: Partial<AdminLocation> = {}): AdminLocation {
  return {
    id: 'l1', slug: 'chennai', city: 'Chennai', address: 'Sterling Rd', phone: '73977 45684', tel: '+917397745684',
    days: 'Monday – Saturday', hours: '11:00 am – 7:00 pm', mapUrl: 'https://maps.example/chennai', imageId: null, sortOrder: 0, image: null, ...over,
  }
}
