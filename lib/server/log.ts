/** Server-side error log; a seam so tests can assert on it without touching the console. */
export function logError(message: string, stack?: string): void {
  if (stack) console.error(message, stack)
  else console.error(message)
}
