import { toAdminService } from './services.mapper'

const media = { id: 'm', key: 'k', url: 'u', thumbUrl: 't', width: 3, height: 2, mime: 'image/jpeg', kind: 'IMAGE', bytes: 1, alt: 'a', caption: null, uploadedById: null, createdAt: new Date(), updatedAt: new Date() }
const base = {
  id: 'i', slug: 's', title: 'T', summary: '', body: '', imageId: null, ctaLabel: 'Enquire →', ctaHref: '',
  contactName: '', contactPhone: '', contactEmail: '', sortOrder: 0, isPublished: false, createdAt: new Date(), updatedAt: new Date(),
}

describe('toAdminService', () => {
  it('maps a null image to null', () => {
    expect(toAdminService({ ...base, image: null }).image).toBeNull()
  })

  it('reduces the media row to the image DTO', () => {
    expect(toAdminService({ ...base, imageId: 'm', image: media as never }).image).toEqual({
      id: 'm', url: 'u', thumbUrl: 't', width: 3, height: 2, alt: 'a',
    })
  })
})
