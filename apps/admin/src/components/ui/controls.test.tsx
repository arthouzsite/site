import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Chip } from './Chip'
import { Dropzone } from './Dropzone'
import { Field } from './Field'
import { ImageSlot } from './ImageSlot'
import { Input } from './Input'
import { Pager } from './Pager'
import { RadioCards } from './RadioCards'
import { Select } from './Select'
import { StatusChip } from './StatusChip'
import { Switch } from './Switch'
import { Tabs } from './Tabs'
import { Textarea } from './Textarea'

describe('Field', () => {
  it('wires label, help and error to the control', () => {
    render(
      <Field name="title" label="Title" required help="Shown on the card" error="Enter a title">
        <Input />
      </Field>,
    )
    const input = screen.getByLabelText(/Title/)
    expect(input).toHaveAttribute('id', 'field-title')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-required', 'true')
    expect(input.getAttribute('aria-describedby')).toBe('field-title-help field-title-err')
    expect(screen.getByText('Enter a title')).toHaveAttribute('id', 'field-title-err')
  })

  it('renders textarea and select controls', () => {
    render(
      <>
        <Field name="bio" label="Bio"><Textarea /></Field>
        <Field name="kind" label="Kind"><Select><option>Solo</option></Select></Field>
      </>,
    )
    expect(screen.getByLabelText('Bio').tagName).toBe('TEXTAREA')
    expect(screen.getByLabelText('Kind').tagName).toBe('SELECT')
  })
})

describe('chips', () => {
  it('maps each status to its label', () => {
    render(
      <>
        <StatusChip status="current" /><StatusChip status="upcoming" /><StatusChip status="past" />
        <StatusChip status="draft" /><StatusChip status="live" /><Chip>Solo</Chip>
      </>,
    )
    for (const t of ['Now on view', 'Upcoming', 'Past', 'Draft', 'Live', 'Solo']) expect(screen.getByText(t)).toBeInTheDocument()
  })
})

describe('Switch', () => {
  it('toggles and exposes the switch role', async () => {
    const onChange = vi.fn()
    render(<Switch label="Featured" onChange={onChange} />)
    await userEvent.click(screen.getByRole('switch', { name: 'Featured' }))
    expect(onChange).toHaveBeenCalled()
  })

  // jsdom cannot measure layout, so assert the structure that guarantees a 44px target:
  // the whole label (min 44x44) wraps the 20px switch, and clicking the label text toggles it.
  it('wraps the switch in a 44px minimum clickable label', async () => {
    render(<Switch label="Featured" />)
    const input = screen.getByRole('switch', { name: 'Featured' })
    const label = input.closest('label')!
    expect(label).toHaveClass('min-h-11', 'min-w-11')
    await userEvent.click(screen.getByText('Featured'))
    expect(input).toBeChecked()
  })
})

describe('Tabs', () => {
  function Harness() {
    const [v, setV] = useState('a')
    return <Tabs label="Sections" value={v} onChange={setV} tabs={[{ id: 'a', label: 'One' }, { id: 'b', label: 'Two' }, { id: 'c', label: 'Three' }]} />
  }
  it('moves selection with arrow keys, Home and End', async () => {
    render(<Harness />)
    const user = userEvent.setup()
    screen.getByRole('tab', { name: 'One' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Two' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Two' })).toHaveFocus()
    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Three' })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'One' })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Three' })).toHaveAttribute('aria-selected', 'true')
  })
})

describe('RadioCards', () => {
  it('selects by click and arrow keys', async () => {
    const onChange = vi.fn()
    render(<RadioCards label="Layout" value="a" onChange={onChange} options={[{ value: 'a', name: 'Grid' }, { value: 'b', name: 'List' }]} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('radio', { name: 'List' }))
    expect(onChange).toHaveBeenLastCalledWith('b')
    screen.getByRole('radio', { name: 'Grid' }).focus()
    await user.keyboard('{ArrowDown}')
    expect(onChange).toHaveBeenLastCalledWith('b')
  })
})

describe('Pager', () => {
  it('shows the range and pages', async () => {
    const onPage = vi.fn()
    render(<Pager page={2} limit={10} total={45} onPage={onPage} />)
    expect(screen.getByText('11–20 of 45')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page')
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(onPage).toHaveBeenCalledWith(3)
    await userEvent.click(screen.getByRole('button', { name: 'Previous' }))
    expect(onPage).toHaveBeenCalledWith(1)
  })
  it('disables Previous on the first page and reports empty totals', () => {
    render(<Pager page={1} limit={10} total={0} onPage={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByText('0–0 of 0')).toBeInTheDocument()
  })
})

describe('ImageSlot and Dropzone', () => {
  it('shows a placeholder, then an image with overlay', () => {
    const { rerender } = render(<ImageSlot ratio="3/2" placeholder="No cover" />)
    expect(screen.getByText('No cover')).toBeInTheDocument()
    rerender(<ImageSlot ratio="1/1" src="/a.jpg" alt="Cover" overlay={<button type="button">Replace</button>} />)
    expect(screen.getByAltText('Cover')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Replace' })).toBeInTheDocument()
  })

  it('reports files chosen through the input', async () => {
    const onFiles = vi.fn()
    render(<Dropzone onFiles={onFiles} accept="image/*" hint="JPEG or PNG" />)
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    await userEvent.upload(screen.getByLabelText('Choose files'), file)
    expect(onFiles).toHaveBeenCalledWith([file])
  })

  it('accepts dropped files, limiting to one when multiple is off', () => {
    const onFiles = vi.fn()
    const { container } = render(<Dropzone onFiles={onFiles} multiple={false} />)
    const a = new File(['a'], 'a.png')
    const b = new File(['b'], 'b.png')
    const zone = container.firstElementChild!
    fireEvent.dragOver(zone)
    fireEvent.drop(zone, { dataTransfer: { files: [a, b] } })
    expect(onFiles).toHaveBeenCalledWith([a])
  })

  it('ignores drops while disabled', () => {
    const onFiles = vi.fn()
    const { container } = render(<Dropzone onFiles={onFiles} disabled />)
    fireEvent.drop(container.firstElementChild!, { dataTransfer: { files: [new File(['a'], 'a.png')] } })
    expect(onFiles).not.toHaveBeenCalled()
  })
})
