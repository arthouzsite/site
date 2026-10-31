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

/** Mirrors the `accept` attribute (mime types, `type/*` wildcards, `.ext`), which the drop path does not enforce. */
export function matchesAccept(file: Pick<File, 'name' | 'type'>, accept?: string): boolean {
  const tokens = (accept ?? '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
  if (tokens.length === 0) return true
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  return tokens.some((t) => (t.startsWith('.') ? name.endsWith(t) : t.endsWith('/*') ? type.startsWith(t.slice(0, -1)) : type === t))
}

function refusalMessage(files: File[]): string {
  const names = files.map((f) => f.name).join(', ')
  return files.length === 1 ? `${names} is not an accepted file type.` : `${names} are not accepted file types.`
}

export function Dropzone({ onFiles, accept, multiple = true, hint, disabled }: Props) {
  const [over, setOver] = useState(false)
  const [refused, setRefused] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    if (disabled) return
    const dropped = Array.from(e.dataTransfer.files)
    const files = dropped.filter((f) => matchesAccept(f, accept))
    const rejected = dropped.filter((f) => !files.includes(f))
    setRefused(rejected.length > 0 ? refusalMessage(rejected) : null)
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
      {refused && <p role="alert" className="m-0 flex items-center gap-1.5 text-12 text-danger"><Icon name="alert" />{refused}</p>}
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
