import { Icon, Select } from '../../components/ui'
import { cx } from '../../components/ui/cx'

const STATUSES = [
  { value: '', label: 'All' },
  { value: 'current', label: 'Now on view' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
]

type Props = {
  search: string
  onSearch: (value: string) => void
  status: string
  onStatus: (value: string) => void
  city: string
  cities: string[]
  onCity: (value: string) => void
  published: string
  onPublished: (value: string) => void
}

const LABEL = 'text-12 font-medium tracking-label text-body'

export function ExhibitionFilters({ search, onSearch, status, onStatus, city, cities, onCity, published, onPublished }: Props) {
  return (
    <div role="search" aria-label="Filter exhibitions" className="flex flex-wrap items-end gap-x-5 gap-y-3">
      <div className="flex flex-col gap-1.5 max-sm:flex-[1_1_100%]">
        <label htmlFor="ex-q" className={LABEL}>Search</label>
        <div className="relative w-[280px] max-sm:w-full">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="ex-q"
            type="search"
            value={search}
            placeholder="Title, artist or venue"
            onChange={(e) => onSearch(e.target.value)}
            className="h-11 w-full rounded-xs border border-line-strong bg-surface-2 pl-9 pr-3 text-14 text-ink placeholder:text-faint hover:border-ink focus:border-ink"
          />
        </div>
      </div>
      <div role="group" aria-labelledby="ex-status-label" className="flex flex-col gap-1.5">
        <span id="ex-status-label" className={LABEL}>Status</span>
        <div className="flex">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              aria-pressed={status === s.value}
              onClick={() => onStatus(s.value)}
              className={cx(
                'h-11 border border-line-strong px-3.5 text-13 transition-colors -ml-px first:ml-0',
                status === s.value ? 'border-ink bg-ink text-paper' : 'bg-surface-2 text-body hover:border-ink',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ex-city" className={LABEL}>City</label>
        <Select id="ex-city" value={city} onChange={(e) => onCity(e.target.value)} className="w-44">
          <option value="">All cities</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ex-published" className={LABEL}>Published</label>
        <Select id="ex-published" value={published} onChange={(e) => onPublished(e.target.value)} className="w-36">
          <option value="">Any</option>
          <option value="true">Published</option>
          <option value="false">Draft</option>
        </Select>
      </div>
    </div>
  )
}
