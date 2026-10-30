const NON_LETTER_BUCKET = '#'

export function indexLetter(sortName: string): string {
  const first = Array.from(sortName.trim())[0]?.toUpperCase()
  return first && /^\p{L}$/u.test(first) ? first : NON_LETTER_BUCKET
}
