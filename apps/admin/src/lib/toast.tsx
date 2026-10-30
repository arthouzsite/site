import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

const DISMISS_MS = 4000
type Kind = 'success' | 'error'
type Toast = { id: number; kind: Kind; message: string }
type ToastApi = { success: (message: string) => void; error: (message: string) => void }

const ToastContext = createContext<ToastApi | null>(null)
let nextId = 1

function ToastItem({ toast, onDone }: { toast: Toast; onDone: (id: number) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDone(toast.id), DISMISS_MS)
    return () => clearTimeout(t)
  }, [toast.id, onDone])
  return (
    <div role="status" className="flex items-center gap-3 bg-ink px-4 py-3 text-13 text-paper shadow-toast">
      <span className={`h-2 w-2 rounded-full ${toast.kind === 'success' ? 'bg-success' : 'bg-danger'}`} aria-hidden="true" />
      {toast.message}
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const dismiss = useCallback((id: number) => setToasts((cur) => cur.filter((t) => t.id !== id)), [])
  const push = useCallback((kind: Kind, message: string) => setToasts((cur) => [...cur, { id: nextId++, kind, message }]), [])
  const api = useMemo<ToastApi>(() => ({ success: (m) => push('success', m), error: (m) => push('error', m) }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-sm:bottom-20 max-sm:right-4">
        {toasts.map((t) => <ToastItem key={t.id} toast={t} onDone={dismiss} />)}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
