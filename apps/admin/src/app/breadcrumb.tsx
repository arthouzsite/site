import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react'

const LabelContext = createContext<string | null>(null)
const SetLabelContext = createContext<(label: string | null) => void>(() => {})

/** Holds the title of the record being edited so the topbar can show it instead of the id in the URL. */
export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [label, setLabel] = useState<string | null>(null)
  return (
    <SetLabelContext.Provider value={setLabel}>
      <LabelContext.Provider value={label}>{children}</LabelContext.Provider>
    </SetLabelContext.Provider>
  )
}

export function useBreadcrumbLabel(): string | null {
  return useContext(LabelContext)
}

/** Sets the current record's crumb while the calling editor is mounted; `null` falls back to the default. */
export function useBreadcrumb(label: string | null): void {
  const setLabel = useContext(SetLabelContext)
  // Layout effect: the previous record's title must not flash for a frame when switching editors.
  useLayoutEffect(() => {
    setLabel(label)
    return () => setLabel(null)
  }, [label, setLabel])
}
