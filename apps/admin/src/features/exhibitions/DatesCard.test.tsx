import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { exhibitionInputSchema } from '@arthouz/shared'
import { useZodForm } from '../../lib/useZodForm'
import { DatesCard } from './DatesCard'
import { defaultValues } from './formValues'

function Harness({ start, end }: { start: string; end: string }) {
  const form = useZodForm(exhibitionInputSchema, { ...defaultValues(), startDate: start, endDate: end })
  return <DatesCard form={form} />
}

describe('DatesCard', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-30T06:00:00.000Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('previews "October 3 – November 22, 2026" and CURRENT chip', () => {
    render(<Harness start="2026-10-03" end="2026-11-22" />)
    expect(screen.getByText(/October 3 – November 22, 2026/)).toBeInTheDocument()
    expect(screen.getByText('Now on view', { selector: 'span' })).toBeInTheDocument()
  })

  it('shows Upcoming for future dates', () => {
    render(<Harness start="2027-01-14" end="2027-02-28" />)
    expect(screen.getByText('Upcoming', { selector: 'span' })).toBeInTheDocument()
  })

  it('shows no preview while a date is missing', () => {
    render(<Harness start="" end="" />)
    expect(screen.queryByText(/Shown on site/)).not.toBeInTheDocument()
  })
})
