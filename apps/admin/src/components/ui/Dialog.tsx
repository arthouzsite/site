import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cx } from './cx'

type Props = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  /** `alertdialog` for short interruptions, `dialog` for task surfaces. */
  role?: 'dialog' | 'alertdialog'
  /** Tailwind width classes; defaults to a 480px dialog. */
  width?: string
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Modal shell with focus trap, Escape to close and focus return. Mark the preferred first focus with `data-autofocus`. */
export function Dialog({ open, title, onClose, children, footer, role = 'dialog', width = 'w-[min(480px,calc(100vw-32px))]' }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const root = dialogRef.current
    const target = root?.querySelector<HTMLElement>('[data-autofocus]') ?? root?.querySelector<HTMLElement>(FOCUSABLE)
    target?.focus()
    return () => previous?.focus?.()
  }, [open])

  if (!open) return null

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab') return
    const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
    if (!nodes || nodes.length === 0) return
    const first = nodes[0]!
    const last = nodes[nodes.length - 1]!
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    // Backdrop only traps Tab and Escape for the dialog inside it; it is not itself interactive.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div className="fixed inset-0 z-[60] grid place-items-center bg-scrim" onKeyDown={onKeyDown}>
      <div
        ref={dialogRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx('flex max-h-[calc(100vh-32px)] flex-col gap-4 bg-surface-2 p-6', width)}
      >
        <h2 id={titleId} className="m-0 font-display text-26 font-normal leading-[1.1]">{title}</h2>
        <div className="min-h-0 flex-1 overflow-auto text-14 text-body">{children}</div>
        {footer && <div className="flex justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
