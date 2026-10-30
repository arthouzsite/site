import { useId } from 'react'
import { Select } from '../../components/ui'
import { MONTH_OPTIONS, firstOfMonth, monthOf, yearOf } from './types'

const FIRST_YEAR = 2000

type Props = { value: string; onChange: (iso: string) => void; error?: string }

/** Month and year selects that together set `publishedAt` to the first day of that month. */
export function MonthYearFields({ value, onChange, error }: Props) {
  const base = useId()
  const month = monthOf(value)
  const year = yearOf(value)
  const lastYear = Math.max(new Date().getUTCFullYear() + 1, year)
  const years = Array.from({ length: lastYear - FIRST_YEAR + 1 }, (_, i) => lastYear - i)
  const labelCls = 'text-12 font-medium tracking-label text-body'

  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0" aria-describedby={error ? `${base}-err` : undefined}>
      <legend className={`${labelCls} mb-1.5 p-0`}>Published on</legend>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-12 text-muted" htmlFor={`${base}-m`}>
          Month
          <Select id={`${base}-m`} value={month} onChange={(e) => onChange(firstOfMonth(year, Number(e.target.value)))}>
            {MONTH_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-12 text-muted" htmlFor={`${base}-y`}>
          Year
          <Select id={`${base}-y`} value={year} onChange={(e) => onChange(firstOfMonth(Number(e.target.value), month))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
        </label>
      </div>
      {error && <p id={`${base}-err`} className="m-0 text-12 text-danger">{error}</p>}
    </fieldset>
  )
}
