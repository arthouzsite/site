import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BulkBar } from '../../features/exhibitions/BulkBar'
import { WorkCard } from '../../features/artists/WorkCard'
import { makeArtwork } from '../../features/artists/testUtils'
import { ImageField } from '../../features/media/ImageField'
import { makeMedia, renderWithProviders } from '../../features/media/testUtils'
import { toMediaRef } from '../../features/media/types'
import { Button } from './Button'

const classesOf = (el: HTMLElement) => el.className.split(/\s+/)

describe('on-dark buttons', () => {
  it('onDark variant draws paper on ink with a designed hover', () => {
    render(<Button variant="onDark">Publish</Button>)
    const cls = classesOf(screen.getByRole('button', { name: 'Publish' }))
    expect(cls).toEqual(expect.arrayContaining(['border-paper', 'text-paper', 'hover:bg-paper', 'hover:text-ink']))
    expect(cls).not.toContain('text-ink')
  })

  it('bulk bar uses variants instead of overriding base colours', () => {
    render(<BulkBar count={2} busy={false} onPublish={vi.fn()} onUnpublish={vi.fn()} onClear={vi.fn()} />)
    for (const name of ['Publish', 'Unpublish', 'Clear']) {
      const cls = classesOf(screen.getByRole('button', { name }))
      expect(cls).not.toContain('text-muted')
      if (name !== 'Clear') expect(cls).not.toContain('hover:text-paper')
    }
    expect(classesOf(screen.getByRole('button', { name: 'Publish' }))).toContain('border-paper')
  })

  it('image field overlay buttons are on-dark, not white surfaces', () => {
    renderWithProviders(<ImageField label="Hero" ratio="3/2" value={toMediaRef(makeMedia())} onChange={vi.fn()} />)
    for (const name of ['Replace', 'Remove']) {
      const cls = classesOf(screen.getByRole('button', { name }))
      expect(cls).toContain('border-paper')
      expect(cls).not.toContain('bg-surface-2')
    }
  })

  it('work card overlay buttons are on-dark, not white surfaces', () => {
    render(<ul><WorkCard work={makeArtwork()} index={0} count={1} busy={false} onEdit={vi.fn()} onRemove={vi.fn()} onMove={vi.fn()} /></ul>)
    for (const name of ['Edit Red Earth', 'Remove Red Earth']) {
      const cls = classesOf(screen.getByRole('button', { name }))
      expect(cls).toContain('border-paper')
      expect(cls).not.toContain('bg-surface-2')
    }
  })
})
