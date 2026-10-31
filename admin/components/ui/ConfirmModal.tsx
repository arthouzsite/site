import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { portalRoot } from '../../lib/portalRoot'
import { Button } from './Button'

type Props = {
  open: boolean
  title: string
  body: ReactNode
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function ConfirmModal({ open, title, body, confirmLabel, cancelLabel = 'Cancel', danger, busy, onConfirm, onCancel }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const bodyId = useId()

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    cancelRef.current?.focus()
    return () => previous?.focus?.()
  }, [open])

  if (!open) return null

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onCancel()
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
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="flex w-[min(480px,calc(100vw-32px))] flex-col gap-4 bg-surface-2 p-6"
      >
        <h2 id={titleId} className="m-0 font-display text-26 font-normal leading-[1.1]">{title}</h2>
        <div id={bodyId} className="text-14 text-body">{body}</div>
        <div className="flex justify-end gap-2">
          <Button ref={cancelRef} onClick={onCancel} disabled={busy}>{cancelLabel}</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>{confirmLabel}</Button>
        </div>
      </div>
    </div>,
    portalRoot(),
  )
}
