/** A copy of `source` without the listed keys; the source object is left untouched. */
export function omit<T extends object, K extends keyof T>(source: T, keys: readonly K[]): Omit<T, K> {
  const dropped = new Set<PropertyKey>(keys)
  return Object.fromEntries(Object.entries(source).filter(([key]) => !dropped.has(key))) as Omit<T, K>
}
