const TZ = 'Asia/Kolkata'
const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: TZ })
const fullDate = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ })
const hourOnly = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: TZ })
const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: TZ })

export function formatDayMonth(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value
  return Number.isNaN(d.getTime()) ? '' : dayMonth.format(d)
}

/** "Thursday 30 October 2026 · Chennai" */
export function dateLine(now: Date): string {
  return `${fullDate.format(now).replace(/,/g, '')} · Chennai`
}

export function greeting(now: Date, firstName: string): string {
  const hour = Number(hourOnly.format(now))
  const part = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  return firstName ? `Good ${part}, ${firstName}` : `Good ${part}`
}

export function timeAgo(value: string, now: Date): string {
  const then = new Date(value)
  const diff = now.getTime() - then.getTime()
  if (Number.isNaN(diff) || diff < MINUTE) return 'just now'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} min ago`
  if (diff < DAY) return `${Math.floor(diff / HOUR)} hr ago`
  const days = Math.round((Date.parse(ymd.format(now)) - Date.parse(ymd.format(then))) / DAY)
  if (days <= 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  return formatDayMonth(then)
}
