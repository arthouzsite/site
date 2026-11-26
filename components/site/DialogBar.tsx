import Link from 'next/link'
import { OutlineButton } from './OutlineButton'
import { Wordmark } from './Wordmark'

/** Top of a full-screen overlay: the logo, which leads home as it does in the header, and Close. */
export function DialogBar({ onClose }: { onClose: () => void }) {
  return (
    <div className="mb-8 flex items-center justify-between gap-6">
      <Link href="/" aria-label="Art Houz home" className="hit-44 flex items-center">
        <Wordmark className="h-12" />
      </Link>
      <OutlineButton tone="ink" onClick={onClose}>
        Close
      </OutlineButton>
    </div>
  )
}
