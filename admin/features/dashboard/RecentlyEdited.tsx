/* eslint-disable @next/next/no-img-element -- Uploaded media are served from the bucket at stored sizes; next/image has nothing to optimise in the CMS. */
import { Link } from 'react-router'
import { Card } from '../../components/ui/Card'
import { StatusChip } from '../../components/ui/StatusChip'
import { timeAgo } from './dates'
import type { RecentItem } from './useDashboard'

type Props = { items: RecentItem[] | undefined; isError: boolean; now: Date }

export function RecentlyEdited({ items, isError, now }: Props) {
  return (
    <Card title="Recently edited">
      {isError && <p role="alert" className="m-0 text-13 text-danger">Could not load recent edits.</p>}
      {items?.length === 0 && <p className="m-0 text-13 text-muted">Nothing edited yet.</p>}
      {items && items.length > 0 && (
        <ul className="m-0 list-none border-t border-line p-0">
          {items.map((it) => (
            <li key={it.key} className="flex min-h-row items-center gap-3.5 border-b border-line py-2">
              {it.thumbUrl ? <img src={it.thumbUrl} alt="" width={44} height={44} className="h-11 w-11 bg-img-ph object-cover" /> : <span aria-hidden="true" className="h-11 w-11 bg-img-ph" />}
              <div className="min-w-0 flex-1">
                <Link to={it.href} className="inline-flex min-h-11 items-center font-display text-17 leading-[1.15] hover:text-rust">{it.title}</Link>
                <div className="text-12 text-muted">{it.kind} · edited {timeAgo(it.updatedAt, now)}</div>
              </div>
              <StatusChip status={it.status} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
