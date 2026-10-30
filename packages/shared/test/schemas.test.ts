import { describe, expect, test } from 'vitest'
import {
  SETTING_DEFAULTS, SETTING_KEYS, artistInputSchema, artworkInputSchema, exhibitionInputSchema,
  exhibitionWorkInputSchema, fairInputSchema, locationInputSchema, loginSchema, mediaPatchSchema,
  newsInputSchema, publicExhibitionSchema, publicHomeSchema, publicSearchSchema, publishSchema,
  reorderSchema, settingSchemas, userInputSchema,
} from '../src/index'

const id = '3f2b8c1e-8a52-4f0e-9d3b-1c2d3e4f5a6b'
const validExhibition = {
  title: 'Tidewater', subtitle: 'Sub', city: 'Chennai', country: 'India', type: 'SOLO',
  startDate: '2026-10-03', endDate: '2026-11-22', venue: 'Main', blurb: 'b', body: 'body',
  heroImageId: id, artistIds: [id],
}

describe('schemas', () => {
  test('exhibitionInputSchema rejects end before start on endDate', () => {
    const r = exhibitionInputSchema.safeParse({ ...validExhibition, startDate: '2026-11-22', endDate: '2026-10-03' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.path).toEqual(['endDate'])
    expect(r.error?.issues[0]?.message).toBe('End date must be on or after the start date')
  })
  test('exhibitionInputSchema accepts valid input and coerces dates', () => {
    const r = exhibitionInputSchema.parse(validExhibition)
    expect(r.startDate).toBeInstanceOf(Date)
    expect(r.statusOverride).toBeNull()
  })
  test('exhibition work', () =>
    expect(exhibitionWorkInputSchema.safeParse({ imageId: id, title: 't', year: '2020', artistId: id, medium: 'oil' }).success).toBe(true))
  test('artist, artwork, fair, location, media, user, login, publish, reorder', () => {
    expect(artistInputSchema.safeParse({ name: 'K.M. Adimoolam', sortName: 'Adimoolam', medium: 'Painting', base: 'Chennai', lede: 'l', bio: 'b', portraitImageId: id, isFeatured: false }).success).toBe(true)
    expect(artworkInputSchema.safeParse({ artistId: id, title: 't', year: '2020', medium: 'oil', size: '1x1', imageId: id }).success).toBe(true)
    expect(fairInputSchema.safeParse({ title: 't', venue: 'v', city: 'c', dateLabel: 'March 2026', booth: 'A1', text: 't', imageId: id }).success).toBe(true)
    expect(locationInputSchema.safeParse({ city: 'c', address: 'a', phone: '+91 1', tel: '+914412345678', days: 'Mon', hours: '10', mapUrl: 'https://maps.example.com', imageId: id }).success).toBe(true)
    expect(mediaPatchSchema.safeParse({ alt: 'x' }).success).toBe(true)
    expect(mediaPatchSchema.safeParse({ alt: '' }).success).toBe(false)
    expect(userInputSchema.safeParse({ email: 'a@b.co', name: 'A', role: 'EDITOR', password: 'longenough1' }).success).toBe(true)
    expect(loginSchema.safeParse({ email: 'bad', password: 'x' }).success).toBe(false)
    expect(publishSchema.safeParse({ isPublished: true }).success).toBe(true)
    expect(reorderSchema.safeParse({ ids: [id] }).success).toBe(true)
  })
  test('locationInputSchema tel must be +digits (8-15) or empty', () => {
    const base = { city: 'c' }
    expect(locationInputSchema.safeParse({ ...base, tel: '+914412345678' }).success).toBe(true)
    expect(locationInputSchema.safeParse({ ...base, tel: '' }).success).toBe(true)
    expect(locationInputSchema.safeParse({ ...base, tel: '044 1234' }).success).toBe(false)
    expect(locationInputSchema.safeParse({ ...base, tel: '+1234567' }).success).toBe(false)
    expect(locationInputSchema.safeParse({ ...base, tel: '+1234567890123456' }).success).toBe(false)
  })
  test('settingSchemas.heroLayout accepts FULL_BLEED|SPLIT only', () => {
    expect(settingSchemas.heroLayout.safeParse('FULL_BLEED').success).toBe(true)
    expect(settingSchemas.heroLayout.safeParse('SPLIT').success).toBe(true)
    expect(settingSchemas.heroLayout.safeParse('OTHER').success).toBe(false)
  })
  test('home settings', () => {
    expect(settingSchemas.homeHeroExhibitionId.safeParse(null).success).toBe(true)
    expect(settingSchemas.homeHeroExhibitionId.safeParse('nope').success).toBe(false)
    expect(settingSchemas.homeArtistCount.safeParse(0).success).toBe(false)
    expect(settingSchemas.homeArtistCount.safeParse(22).success).toBe(true)
  })
  test('every setting key has a schema and default that validates', () => {
    for (const key of SETTING_KEYS) {
      expect(settingSchemas[key].safeParse(SETTING_DEFAULTS[key]).success, key).toBe(true)
    }
    expect(SETTING_DEFAULTS.homeArtistCount).toBe(22)
    expect(SETTING_DEFAULTS.heroLayout).toBe('FULL_BLEED')
    expect(SETTING_DEFAULTS.artistIndexLayout).toBe('GROUPED')
  })
  test('newsInputSchema accepts Tamil title and optional externalUrl', () => {
    const base = { title: 'கலை கண்காட்சி', excerpt: 'e', publishedAt: '2024-02-02', imageId: id }
    expect(newsInputSchema.safeParse(base).success).toBe(true)
    expect(newsInputSchema.safeParse({ ...base, externalUrl: 'https://example.com/a', exhibitionId: id }).success).toBe(true)
    expect(newsInputSchema.safeParse({ ...base, externalUrl: 'not a url' }).success).toBe(false)
  })
  test('public schemas', () => {
    const image = { url: 'https://x/y.jpg', thumbUrl: 'https://x/t.webp', width: 1, height: 1, alt: 'a' }
    expect(publicExhibitionSchema.safeParse({
      id, slug: 's', title: 't', subtitle: '', city: 'c', country: 'India', type: 'SOLO', status: 'PAST',
      statusLabel: 'Past', datesLabel: 'x', artistLine: 'a', image,
    }).success).toBe(true)
    expect(publicSearchSchema.safeParse({ artists: [], exhibitions: [], news: [] }).success).toBe(true)
    expect(publicHomeSchema.safeParse({}).success).toBe(false)
  })
})
