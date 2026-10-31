import { expect, test } from 'vitest'
import { slugify } from '../index'

test('matches prototype slugs', () => {
  expect(slugify("By Nature's Force: Veli Vetridamakha Nagarkirathu")).toBe('by-nature-s-force-veli-vetridamakha-nagarkirathu')
  expect(slugify('K.M. Adimoolam')).toBe('k-m-adimoolam')
})
test('trims leading and trailing separators', () => expect(slugify('  --Hello!! ')).toBe('hello'))
