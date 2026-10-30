import type { AdminFair } from './types'

export function makeFair(over: Partial<AdminFair> = {}): AdminFair {
  return {
    id: 'f1', slug: 'art-dubai-2026', title: 'Art Dubai 2026', venue: 'Madinat Jumeirah', city: 'Dubai', dateLabel: 'March 2026',
    booth: 'Contemporary section', text: 'Our booth.', imageId: null, sortOrder: 0, isPublished: true, image: null,
    where: 'Madinat Jumeirah, Dubai · March 2026', updatedAt: '2026-10-21T10:00:00.000Z', ...over,
  }
}
