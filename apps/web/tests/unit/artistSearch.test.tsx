// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ArtistSearch } from '@/components/artists/ArtistSearch'

vi.mock('next/navigation', () => ({
  usePathname: () => '/artists',
  useRouter: () => ({ replace: vi.fn() }),
}))

afterEach(cleanup)

describe('ArtistSearch', () => {
  it('follows initialQuery when the URL changes under it', () => {
    const { rerender } = render(<ArtistSearch initialQuery="pich" />)
    const input = screen.getByRole('searchbox') as HTMLInputElement
    expect(input.value).toBe('pich')
    rerender(<ArtistSearch initialQuery="" />)
    expect(input.value).toBe('')
    rerender(<ArtistSearch initialQuery="amol" />)
    expect(input.value).toBe('amol')
  })
})
