import { cx } from './cx'
import { Button } from './Button'

type Props = { page: number; limit: number; total: number; onPage: (page: number) => void }

function pageWindow(page: number, pages: number): number[] {
  const start = Math.max(1, Math.min(page - 2, pages - 4))
  const end = Math.min(pages, start + 4)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

export function Pager({ page, limit, total, onPage }: Props) {
  const pages = Math.max(1, Math.ceil(total / limit))
  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(total, page * limit)
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 text-13 text-muted">
      <span>{from}–{to} of {total}</span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
        {pageWindow(page, pages).map((p) => (
          <button
            key={p}
            type="button"
            aria-label={`Page ${p}`}
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onPage(p)}
            className={cx('h-11 w-11 border bg-transparent hover:border-line-strong md:h-9 md:w-9', p === page ? 'border-ink text-ink' : 'border-transparent')}
          >
            {p}
          </button>
        ))}
        <Button variant="ghost" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
      </div>
    </nav>
  )
}
