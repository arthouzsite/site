import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ErrorSummary } from './ErrorSummary'

describe('ErrorSummary', () => {
  it('focuses on mount and links fields', () => {
    render(
      <>
        <input id="field-title" aria-label="Title" />
        <ErrorSummary errors={[{ name: 'title', message: 'Enter a title' }]} />
      </>,
    )
    const box = screen.getByRole('alert')
    expect(box).toHaveFocus()
    expect(screen.getByText('There is a problem')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Enter a title' })).toHaveAttribute('href', '#field-title')
  })

  it('moves focus to the field when a link is activated', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    render(
      <>
        <input id="field-title" aria-label="Title" />
        <ErrorSummary errors={[{ name: 'title', message: 'Enter a title' }]} />
      </>,
    )
    await userEvent.click(screen.getByRole('link', { name: 'Enter a title' }))
    expect(screen.getByLabelText('Title')).toHaveFocus()
  })

  it('gives each summary its own title id so two can be on screen at once', () => {
    render(
      <>
        <ErrorSummary errors={[{ name: 'title', message: 'Enter a title' }]} />
        <ErrorSummary errors={[{ name: 'year', message: 'Enter a year' }]} idPrefix="dialog" />
      </>,
    )
    const [first, second] = screen.getAllByRole('alert')
    const ids = [first, second].map((box) => box!.getAttribute('aria-labelledby'))
    expect(ids[0]).not.toBe(ids[1])
    expect(first).toHaveAccessibleName('There is a problem')
    expect(second).toHaveAccessibleName('There is a problem')
    expect(screen.getByRole('link', { name: 'Enter a year' })).toHaveAttribute('href', '#dialog-year')
  })

  it('renders nothing without errors', () => {
    const { container } = render(<ErrorSummary errors={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
