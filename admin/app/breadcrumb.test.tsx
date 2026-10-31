import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { BreadcrumbProvider, useBreadcrumb } from './breadcrumb'
import { Topbar } from './Topbar'

const user = { id: '1', email: 'p@x.com', name: 'Priya Raman', role: 'EDITOR' as const }

function Record({ label }: { label: string | null }) {
  useBreadcrumb(label)
  return null
}

function mount(path: string, record?: { label: string | null }) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BreadcrumbProvider>
        <Topbar user={user} onLogout={() => {}} />
        {record && <Record label={record.label} />}
      </BreadcrumbProvider>
    </MemoryRouter>,
  )
}

describe('breadcrumbs', () => {
  it('shows the record title instead of the id and links the section', () => {
    mount('/exhibitions/11111111-1111-4111-8111-111111111111', { label: 'Tidewater' })
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(nav).toHaveTextContent('CMS/Exhibitions/Tidewater')
    expect(nav).not.toHaveTextContent('1111')
    expect(screen.getByRole('link', { name: 'Exhibitions' })).toHaveAttribute('href', '/exhibitions')
    expect(screen.getByText('Tidewater')).toHaveAttribute('aria-current', 'page')
  })

  it('never shows a raw id while the record is loading', () => {
    mount('/artists/9f8e7d6c-0000-4000-8000-000000000000')
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(nav).toHaveTextContent('CMS/Artists/Loading…')
    expect(nav).not.toHaveTextContent('9f8e7d6c')
  })

  it('shows New for the create route and clears the label on unmount', () => {
    const { rerender } = mount('/news/new', { label: 'New news item' })
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('CMS/News/New news item')
    rerender(
      <MemoryRouter initialEntries={['/news/new']}>
        <BreadcrumbProvider>
          <Topbar user={user} onLogout={() => {}} />
        </BreadcrumbProvider>
      </MemoryRouter>,
    )
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('CMS/News/New')
  })

  it('keeps single-segment pages as a plain current crumb', () => {
    mount('/settings')
    expect(screen.getByText('Home & settings')).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('link', { name: 'Home & settings' })).not.toBeInTheDocument()
  })
})
