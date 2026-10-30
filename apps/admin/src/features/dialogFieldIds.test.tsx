import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Field, Input } from '../components/ui'
import { WorkDialog as ArtistWorkDialog } from './artists/WorkDialog'
import { makeArtist, renderRoutes } from './artists/testUtils'
import { WorkDialog as ExhibitionWorkDialog } from './exhibitions/WorkDialog'
import { ID, renderWithProviders } from './exhibitions/testUtils'

function ParentForm() {
  return (
    <form>
      <Field name="title" label="Title"><Input /></Field>
      <Field name="year" label="Year"><Input /></Field>
      <Field name="medium" label="Medium"><Input /></Field>
    </form>
  )
}

function duplicateIds(): string[] {
  const seen = new Set<string>()
  const dupes: string[] = []
  for (const el of document.body.querySelectorAll('[id]')) {
    if (seen.has(el.id)) dupes.push(el.id)
    seen.add(el.id)
  }
  return dupes
}

function expectLabelled(dialog: HTMLElement, label: string | RegExp) {
  const input = within(dialog).getByLabelText(label)
  expect(document.querySelectorAll(`label[for="${input.id}"]`)).toHaveLength(1)
  expect(document.querySelectorAll(`[id="${input.id}"]`)).toHaveLength(1)
  return input
}

describe('dialog field ids', () => {
  it('exhibition work dialog does not reuse ids of the form behind it', async () => {
    renderWithProviders(
      <>
        <ParentForm />
        <ExhibitionWorkDialog open onClose={() => {}} exhibitionId={ID.ex} artists={[]} />
      </>,
    )
    const dialog = await screen.findByRole('dialog', { name: 'Add work' })
    for (const label of [/^Title/, 'Year', 'Medium', /^Artist/]) expectLabelled(dialog, label)
    expect(duplicateIds()).toEqual([])
    expect(within(dialog).getByLabelText(/^Title/).id).not.toBe('field-title')
  })

  it('artist work dialog does not reuse ids of the form behind it', async () => {
    renderRoutes([{ path: '/', element: <><ParentForm /><ArtistWorkDialog artistId={makeArtist().id} artwork={null} onClose={() => {}} /></> }], '/')
    const dialog = await screen.findByRole('dialog', { name: 'Add work' })
    for (const label of [/^Title/, 'Year', 'Size', 'Medium']) expectLabelled(dialog, label)
    expect(duplicateIds()).toEqual([])
  })
})
