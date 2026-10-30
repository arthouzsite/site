import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type RowSelectionState,
} from '@tanstack/react-table'
import { useMemo } from 'react'

type Props<T> = {
  label: string
  data: T[]
  columns: ColumnDef<T, unknown>[]
  getRowId: (row: T) => string
  selectable?: boolean
  selection?: RowSelectionState
  onSelectionChange?: OnChangeFn<RowSelectionState>
  empty?: string
}

const CELL = 'h-row whitespace-nowrap border-b border-line px-3.5 text-left align-middle'

export function DataTable<T>({ label, data, columns, getRowId, selectable, selection, onSelectionChange, empty = 'Nothing to show.' }: Props<T>) {
  const allColumns = useMemo<ColumnDef<T, unknown>[]>(() => {
    if (!selectable) return columns
    const select: ColumnDef<T, unknown> = {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          className="checkbox"
          aria-label="Select all rows"
          checked={table.getIsAllRowsSelected()}
          ref={(el) => { if (el) el.indeterminate = table.getIsSomeRowsSelected() }}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input type="checkbox" className="checkbox" aria-label="Select row" checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()} />
      ),
    }
    return [select, ...columns]
  }, [columns, selectable])

  const table = useReactTable({
    data,
    columns: allColumns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: selectable,
    state: { rowSelection: selection ?? {} },
    onRowSelectionChange: onSelectionChange,
  })

  return (
    <div className="max-h-[70vh] overflow-auto border border-line bg-surface">
      <table aria-label={label} className="w-full min-w-[760px] border-collapse">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th key={h.id} scope="col" className={`${CELL} sticky top-0 z-10 bg-surface text-11 font-medium uppercase tracking-eyebrow text-muted`}>
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr><td colSpan={allColumns.length} className={`${CELL} text-center text-13 text-muted`}>{empty}</td></tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id} aria-selected={selectable ? row.getIsSelected() : undefined} className="transition-colors hover:bg-row-hover aria-selected:bg-warn-bg">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={CELL}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
