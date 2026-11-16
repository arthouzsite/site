import { describe, expect, it } from 'vitest'
import { sortByTitle } from './services.order'

const row = (id: string, title: string) => ({ id, title })

describe('sortByTitle', () => {
  it('orders A to Z ignoring case', () => {
    const rows = [row('1', 'framing services'), row('2', 'Art sales'), row('3', 'gallery on rent'), row('4', 'Appraisals')]

    expect(sortByTitle(rows).map((r) => r.title)).toEqual(['Appraisals', 'Art sales', 'framing services', 'gallery on rent'])
  })

  it('breaks ties by id and does not mutate the input', () => {
    const rows = [row('b', 'Same'), row('a', 'same')]

    expect(sortByTitle(rows).map((r) => r.id)).toEqual(['a', 'b'])
    expect(rows.map((r) => r.id)).toEqual(['b', 'a'])
  })
})
