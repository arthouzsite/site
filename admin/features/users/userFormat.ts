import { formatDate } from '../../lib/format'

const TZ = 'Asia/Kolkata'
const day = new Intl.DateTimeFormat('en-CA', { timeZone: TZ })
const clock = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ })

/** "Today, 2:10 pm", a date for earlier days, or "Never". */
export function formatLastSignIn(value: string | null, now: Date = new Date()): string {
  if (!value) return 'Never'
  const when = new Date(value)
  if (day.format(when) !== day.format(now)) return formatDate(when)
  return `Today, ${clock.format(when).replace(/\s?([ap]m)/i, ' $1').toLowerCase()}`
}

export type UserStatus = 'Active' | 'Invited' | 'Disabled'
export function userStatus(u: { isDisabled: boolean; lastLoginAt: string | null }): UserStatus {
  if (u.isDisabled) return 'Disabled'
  return u.lastLoginAt ? 'Active' : 'Invited'
}
