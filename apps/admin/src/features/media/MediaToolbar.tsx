import { Icon, Switch } from '../../components/ui'

type Props = {
  search: string
  onSearch: (value: string) => void
  missingAlt: boolean
  onMissingAlt: (on: boolean) => void
}

export function MediaToolbar({ search, onSearch, missingAlt, onMissingAlt }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2" role="search">
      <div className="relative w-[320px] max-sm:w-full max-sm:flex-[1_1_100%]">
        <label htmlFor="media-q" className="sr-only">Search by file name or alt text</label>
        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          id="media-q"
          type="search"
          value={search}
          placeholder="Search by file name or alt text"
          onChange={(e) => onSearch(e.target.value)}
          className="h-11 w-full rounded-xs border border-line-strong bg-surface-2 pl-9 pr-3 text-14 text-ink placeholder:text-faint hover:border-ink focus:border-ink"
        />
      </div>
      <Switch label="Missing alt text" checked={missingAlt} onChange={(e) => onMissingAlt(e.target.checked)} />
    </div>
  )
}
