import { useEffect, type ReactNode } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ErrorSummary } from '../../components/ui/ErrorSummary'
import { panelId, tabId } from '../../components/ui/Tabs'
import type { SettingCard } from '../settings/useSettingCard'

export type SectionProps = {
  settings: Record<string, unknown>
  active: boolean
  onDirtyChange: (id: string, dirty: boolean) => void
}

type Props = { id: string; title: string; card: SettingCard; active: boolean; onDirtyChange: (id: string, dirty: boolean) => void; aside: ReactNode; children: ReactNode }

/** Tab panel layout from the mockup: fields card on the left, image and Save section on the right. Stays mounted while hidden. */
export function AboutSection({ id, title, card, active, onDirtyChange, aside, children }: Props) {
  useEffect(() => onDirtyChange(id, card.isDirty), [id, card.isDirty, onDirtyChange])

  return (
    <form
      onSubmit={card.onSubmit}
      noValidate
      role="tabpanel"
      id={panelId(id)}
      aria-labelledby={tabId(id)}
      hidden={!active}
      className="grid grid-cols-1 items-start gap-8 pt-6 min-[1100px]:grid-cols-[minmax(0,1fr)_360px]"
    >
      <Card title={title}>
        <ErrorSummary errors={card.errors} focusKey={card.submitCount} />
        {children}
      </Card>
      <div className="flex flex-col gap-4 border border-line bg-surface p-5 min-[1100px]:sticky min-[1100px]:top-[calc(var(--spacing-topbar)+24px)]">
        {aside}
        <Button type="submit" variant="primary" disabled={!card.isDirty || card.isSaving}>Save section</Button>
      </div>
    </form>
  )
}
