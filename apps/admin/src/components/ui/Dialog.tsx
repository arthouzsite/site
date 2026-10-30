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
  /** Keep the title for assistive tech only, for surfaces whose content explains itself (search). */
  hideTitle?: boolean
  /** `top` anchors the dialog near the top so it does not jump as its content grows. */
  placement?: 'center' | 'top'
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Modal shell with focus trap, Escape to close and focus return. Mark the preferred first focus with `data-autofocus`. */
export function Dialog({ open, title, onClose, children, footer, role = 'dialog', width = 'w-[min(480px,calc(100vw-32px))]', hideTitle = false, placement = 'center' }: Props) {
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
    <div className={cx('fixed inset-0 z-[60] grid bg-scrim', placement === 'top' ? 'place-items-start justify-items-center pt-[12vh] max-sm:pt-4' : 'place-items-center')} onKeyDown={onKeyDown}>
      <div
        ref={dialogRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx('flex flex-col gap-4 bg-surface-2 p-6', placement === 'top' ? 'max-h-[calc(100vh-12vh-16px)] max-sm:max-h-[calc(100vh-32px)]' : 'max-h-[calc(100vh-32px)]', width)}
      >
        <h2 id={titleId} className={cx('m-0 font-display text-26 font-normal leading-[1.1]', hideTitle && 'sr-only')}>{title}</h2>
        <div className="min-h-0 flex-1 overflow-auto text-14 text-body">{children}</div>
        {footer && <div className="flex justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
