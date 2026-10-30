import { useId, useRef, useState, type DragEvent } from 'react'
import { Icon } from './Icon'
import { cx } from './cx'

type Props = {
  onFiles: (files: File[]) => void
  accept?: string
  multiple?: boolean
  hint?: string
  disabled?: boolean
}

export function Dropzone({ onFiles, accept, multiple = true, hint, disabled }: Props) {
  const [over, setOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    if (disabled) return
    const files = Array.from(e.dataTransfer.files)
    if (files.length) onFiles(multiple ? files : files.slice(0, 1))
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cx(
        'flex flex-col items-center gap-2.5 border border-dashed px-5 py-7 text-center text-13 text-muted transition-colors',
        over ? 'border-amber bg-warn-bg' : 'border-line-strong bg-surface-2 hover:border-amber hover:bg-warn-bg',
      )}
    >
      <Icon name="upload" width={20} height={20} />
      <p className="m-0"><strong className="font-medium text-ink">Drop files here</strong> or choose them from your device</p>
      {hint && <p className="m-0 text-12">{hint}</p>}
      <label htmlFor={inputId} className={cx('inline-flex h-11 cursor-pointer items-center border border-ink px-[18px] text-12 uppercase tracking-eyebrow text-ink hover:bg-ink hover:text-paper focus-within:shadow-focus', disabled && 'pointer-events-none opacity-45')}>
        Choose files
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          className="sr-only"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            if (files.length) onFiles(files)
            e.target.value = ''
          }}
        />
      </label>
    </div>
  )
}
