import { DEFAULT_CTA_LABEL, type AdminService } from './types'

export function makeService(over: Partial<AdminService> = {}): AdminService {
  return {
    id: 's1', slug: 'art-sales', title: 'Art sales', summary: 'Works available from the gallery.', body: 'First paragraph.\n\nSecond paragraph.',
    imageId: null, image: null, ctaLabel: DEFAULT_CTA_LABEL, ctaHref: '', contactName: '', contactPhone: '', contactEmail: '',
    sortOrder: 0, isPublished: true, createdAt: '2026-10-20T10:00:00.000Z', updatedAt: '2026-10-21T10:00:00.000Z', ...over,
  }
}
