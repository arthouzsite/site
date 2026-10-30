import { expect, test } from 'vitest'
import { indexLetter } from '../src/index'

test('K.M. Adimoolam → K; 2 → #', () => {
  expect(indexLetter('K.M. Adimoolam')).toBe('K')
  expect(indexLetter('2 Artists')).toBe('#')
  expect(indexLetter('adi')).toBe('A')
  expect(indexLetter('')).toBe('#')
})
test('non A–Z initials map to #', () => {
  expect(indexLetter('Élan')).toBe('#')
  expect(indexLetter('நான் யார்')).toBe('#')
})
