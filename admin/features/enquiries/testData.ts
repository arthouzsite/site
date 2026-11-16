import type { AdminEnquiry } from './types'

export function makeEnquiry(over: Partial<AdminEnquiry> = {}): AdminEnquiry {
  return {
    id: 'e1', kind: 'ARTIST', subject: 'Vijay Pichumani', subjectRemoved: false, name: 'Asha Rao', email: 'asha@example.com',
    mobile: '+919876543210', message: 'Is the large canvas available?', dateFrom: null, dateTo: null, purpose: null, location: null,
    isHandled: false, createdAt: '2026-11-16T09:30:00.000Z', ...over,
  }
}

export const serviceEnquiry = (over: Partial<AdminEnquiry> = {}): AdminEnquiry =>
  makeEnquiry({
    id: 'e2', kind: 'SERVICE', subject: 'Photo shoots', name: 'Ravi Kumar', email: 'ravi@example.com', mobile: '+914412345678',
    message: '', dateFrom: '2026-12-01', dateTo: '2026-12-05', purpose: 'Photography', location: 'Chennai', createdAt: '2026-11-15T09:30:00.000Z', ...over,
  })
