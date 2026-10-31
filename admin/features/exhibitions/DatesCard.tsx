import { formatDateRange, resolveExhibitionStatus, type ExhibitionStatus } from '@/lib/shared'
import { Field, Input, Select, StatusChip } from '../../components/ui'
import { FormCard } from './FormCard'
import { FIELD_PROMPTS, nullIfBlank, type ExhibitionZodForm } from './formValues'
import { messageFor } from './formErrors'
import { STATUS_TO_CHIP } from './types'

const OVERRIDES: Array<{ value: ExhibitionStatus | ''; label: string }> = [
  { value: '', label: 'Auto' },
  { value: 'CURRENT', label: 'Now on view' },
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'PAST', label: 'Past' },
]

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || value === '') return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Live preview of what the site shows, from the unsaved form values. */
export function previewDates(start: unknown, end: unknown, override: ExhibitionStatus | null) {
  const s = parseDate(start)
  const e = parseDate(end)
  if (!s || !e || e < s) return null
  return { label: formatDateRange(s, e), status: resolveExhibitionStatus({ startDate: s, endDate: e, statusOverride: override }) }
}

export function DatesCard({ form }: { form: ExhibitionZodForm }) {
  const { register, watch, formState: { errors } } = form
  const [startDate, endDate, statusOverride] = watch(['startDate', 'endDate', 'statusOverride'])
  const preview = previewDates(startDate, endDate, statusOverride ?? null)
  const err = (name: 'startDate' | 'endDate') => messageFor(errors[name], FIELD_PROMPTS[name]!)

  return (
    <FormCard title="Dates">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <Field name="startDate" label="Start date" required error={err('startDate')}>
          <Input type="date" {...register('startDate')} />
        </Field>
        <Field name="endDate" label="End date" required error={err('endDate')}>
          <Input type="date" {...register('endDate')} />
        </Field>
      </div>
      {preview && (
        <p className="m-0 flex flex-wrap items-center gap-2 text-12 text-muted">
          <span>Shown on site as “{preview.label}”</span>
          <StatusChip status={STATUS_TO_CHIP[preview.status]} />
        </p>
      )}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <Field name="datesLabel" label="Dates label override" help="Leave blank to use the label above." error={errors.datesLabel?.message}>
          <Input {...register('datesLabel', { setValueAs: nullIfBlank })} placeholder={preview?.label} />
        </Field>
        <Field name="statusOverride" label="Status override" help="Auto compares today with the start and end dates.">
          <Select {...register('statusOverride', { setValueAs: nullIfBlank })}>
            {OVERRIDES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </Field>
      </div>
    </FormCard>
  )
}
