const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

const RANGE_SEPARATOR = ' – '

function monthName(d: Date): string {
  return MONTH_NAMES[d.getUTCMonth()] ?? ''
}

export function formatMonthYear(d: Date): string {
  return `${monthName(d)} ${d.getUTCFullYear()}`
}

export function formatDateRange(start: Date, end: Date): string {
  const startPart = `${monthName(start)} ${start.getUTCDate()}`
  const endPart = `${monthName(end)} ${end.getUTCDate()}, ${end.getUTCFullYear()}`
  if (start.getUTCFullYear() === end.getUTCFullYear()) {
    return `${startPart}${RANGE_SEPARATOR}${endPart}`
  }
  return `${startPart}, ${start.getUTCFullYear()}${RANGE_SEPARATOR}${endPart}`
}
