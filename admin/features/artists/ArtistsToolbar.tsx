import { Icon, Select } from '../../components/ui'

type Props = {
  search: string
  onSearch: (value: string) => void
  featured: string
  onFeatured: (value: string) => void
  published: string
  onPublished: (value: string) => void
}

export function ArtistsToolbar({ search, onSearch, featured, onFeatured, published, onPublished }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3" role="search">
      <div className="relative w-[320px] max-sm:w-full max-sm:flex-[1_1_100%]">
        <label htmlFor="artists-q" className="sr-only">Search artists</label>
        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          id="artists-q"
          type="search"
          value={search}
          placeholder="Search artists"
          onChange={(e) => onSearch(e.target.value)}
          className="h-11 w-full rounded-xs border border-line-strong bg-surface-2 pl-9 pr-3 text-14 text-ink placeholder:text-faint hover:border-ink focus:border-ink"
        />
      </div>
      <label className="sr-only" htmlFor="artists-featured">Featured</label>
      <Select id="artists-featured" className="w-auto" value={featured} onChange={(e) => onFeatured(e.target.value)}>
        <option value="">Featured: all</option>
        <option value="true">Featured only</option>
        <option value="false">Not featured</option>
      </Select>
      <label className="sr-only" htmlFor="artists-published">Published</label>
      <Select id="artists-published" className="w-auto" value={published} onChange={(e) => onPublished(e.target.value)}>
        <option value="">Published: all</option>
        <option value="true">Published</option>
        <option value="false">Draft</option>
      </Select>
    </div>
  )
}
