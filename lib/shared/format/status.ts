import { KOLKATA_TIME_ZONE, type ExhibitionStatus } from '../constants'

export type StatusBadge = { label: string; bg: string; fg: string; line: string }

export const STATUS_BADGE: Record<ExhibitionStatus, StatusBadge> = {
  CURRENT: { label: 'Now on view', bg: '#D98A2B', fg: '#161513', line: '#D98A2B' },
  UPCOMING: { label: 'Upcoming', bg: '#161513', fg: '#EDEAE4', line: '#161513' },
  PAST: { label: 'Past', bg: 'transparent', fg: '#5E5A54', line: 'rgba(22,21,19,0.3)' },
}

const kolkataDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: KOLKATA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function todayInKolkata(now: Date = new Date()): Date {
  return new Date(`${kolkataDateFormat.format(now)}T00:00:00.000Z`)
}

export function deriveExhibitionStatus(start: Date, end: Date, today: Date): ExhibitionStatus {
  if (today.getTime() < start.getTime()) return 'UPCOMING'
  if (today.getTime() > end.getTime()) return 'PAST'
  return 'CURRENT'
}

export function resolveExhibitionStatus(
  e: { startDate: Date; endDate: Date; statusOverride: ExhibitionStatus | null },
  today: Date = todayInKolkata(),
): ExhibitionStatus {
  return e.statusOverride ?? deriveExhibitionStatus(e.startDate, e.endDate, today)
}
