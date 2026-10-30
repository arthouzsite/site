import type { ReactNode } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ErrorSummary } from '../../components/ui/ErrorSummary'
import type { SettingCard } from './useSettingCard'

type Props = { title: string; card: SettingCard; readOnly: boolean; saveLabel?: string; children: ReactNode }

/** Card chrome shared by the settings cards: error summary, read-only fieldset and the card's own Save button. */
export function SettingCardShell({ title, card, readOnly, saveLabel = 'Save', children }: Props) {
  return (
    <form onSubmit={card.onSubmit} noValidate>
      <Card title={title}>
        <ErrorSummary errors={card.errors} focusKey={card.submitCount} />
        <fieldset disabled={readOnly} className="m-0 flex min-w-0 flex-col gap-[18px] border-0 p-0">
          {children}
        </fieldset>
        {!readOnly && (
          <Button type="submit" variant="primary" className="self-start" disabled={!card.isDirty || card.isSaving}>
            {saveLabel}
          </Button>
        )}
      </Card>
    </form>
  )
}
