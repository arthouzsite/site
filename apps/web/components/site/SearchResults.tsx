import Link from 'next/link'
import type { SearchResult } from '@/hooks/useSiteSearch'

type Props = { result: SearchResult; onNavigate: () => void }

const MESSAGE = 'mt-10 text-[16px] text-muted'

/** Result groups under the search input (prototype: eyebrow label, 26 px display rows, rust on hover). */
export function SearchResults({ result, onNavigate }: Props) {
  if (result.failed) {
    return (
      <p role="status" className={`m-0 ${MESSAGE}`}>
        Search is unavailable right now. Please try again in a moment.
      </p>
    )
  }
  if (result.groups.length === 0) {
    return (
      <p role="status" className={`m-0 ${MESSAGE}`}>
        Nothing found for “{result.query}”.
      </p>
    )
  }
  const count = result.groups.reduce((total, group) => total + group.items.length, 0)
  return (
    <>
      <p role="status" className="sr-only">
        {count === 1 ? '1 result' : `${count} results`}
      </p>
      {result.groups.map((group) => (
        <section key={group.label} aria-label={group.label} className="mt-10">
          <h2 className="m-0 mb-[6px] text-[11.5px] font-normal tracking-[0.18em] text-muted uppercase">{group.label}</h2>
          <ul className="m-0 list-none p-0">
            {group.items.map((item) => (
              <li key={`${item.href}|${item.label}`}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className="block border-b border-line-14 py-[14px] font-display-tamil text-[26px] leading-[1.2] text-ink hover:text-rust"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}
