/** Services are listed A to Z by title, case-insensitive; `sortOrder` is no longer consulted. */
const COLLATION_LOCALE = 'en'

type Titled = { id: string; title: string }

function byTitle(a: Titled, b: Titled): number {
  const byName = a.title.localeCompare(b.title, COLLATION_LOCALE, { sensitivity: 'base' })
  return byName !== 0 ? byName : a.id.localeCompare(b.id)
}

export function sortByTitle<T extends Titled>(rows: readonly T[]): T[] {
  return [...rows].sort(byTitle)
}
