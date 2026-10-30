import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ColumnDef, RowSelectionState } from '@tanstack/react-table'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { DataTable } from './DataTable'

type Row = { id: string; title: string }
const columns: ColumnDef<Row, unknown>[] = [{ accessorKey: 'title', header: 'Title' }]
const data: Row[] = [{ id: '1', title: 'Alpha' }, { id: '2', title: 'Beta' }]

function Harness({ rows = data }: { rows?: Row[] }) {
  const [sel, setSel] = useState<RowSelectionState>({})
  return <DataTable label="Exhibitions" data={rows} columns={columns} getRowId={(r) => r.id} selectable selection={sel} onSelectionChange={setSel} />
}

describe('DataTable', () => {
  it('selects rows and marks them aria-selected', async () => {
    render(<Harness />)
    const rows = screen.getAllByRole('row')
    await userEvent.click(within(rows[1]!).getByRole('checkbox'))
    expect(rows[1]).toHaveAttribute('aria-selected', 'true')
    expect(rows[2]).toHaveAttribute('aria-selected', 'false')
  })

  it('select-all toggles every row', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select all rows' }))
    screen.getAllByRole('checkbox', { name: 'Select row' }).forEach((c) => expect(c).toBeChecked())
  })

  it('shows the empty message', () => {
    render(<Harness rows={[]} />)
    expect(screen.getByText('Nothing to show.')).toBeInTheDocument()
  })

  it('renders without a selection column by default', () => {
    render(<DataTable label="Plain" data={data} columns={columns} getRowId={(r) => r.id} />)
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.getByText('Alpha')).toBeInTheDocument()
  })
})
