import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { OrderedList } from './OrderedList'

type Item = { id: string; name: string }
const initial: Item[] = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Beta' },
  { id: 'c', name: 'Gamma' },
]

function Harness({ onRemove }: { onRemove?: (id: string) => void }) {
  const [items, setItems] = useState(initial)
  return (
    <OrderedList
      label="Artists"
      items={items}
      onMove={(id, dir) =>
        setItems((cur) => {
          const i = cur.findIndex((x) => x.id === id)
          const j = dir === 'up' ? i - 1 : i + 1
          if (i < 0 || j < 0 || j >= cur.length) return cur
          const next = [...cur]
          const a = next[i]!
          next[i] = next[j]!
          next[j] = a
          return next
        })
      }
      onRemove={onRemove}
      renderItem={(it) => it.name}
    />
  )
}

const names = () => within(screen.getByRole('list', { name: 'Artists' })).getAllByRole('listitem').map((li) => li.querySelector('[data-name]')?.textContent)

describe('OrderedList', () => {
  it('move down swaps order and announces via aria-live', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Move Alpha down' }))
    expect(names()).toEqual(['Beta', 'Alpha', 'Gamma'])
    expect(screen.getByRole('status')).toHaveTextContent('Alpha moved to position 2 of 3')
  })

  it('disables up on the first row and down on the last', () => {
    render(<Harness />)
    expect(screen.getByRole('button', { name: 'Move Alpha up' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move Gamma down' })).toBeDisabled()
  })

  it('calls onRemove with the item id', async () => {
    const onRemove = vi.fn()
    render(<Harness onRemove={onRemove} />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove Beta' }))
    expect(onRemove).toHaveBeenCalledWith('b')
  })
})
