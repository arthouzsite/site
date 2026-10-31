import { afterEach, describe, expect, it } from 'vitest'
import { portalRoot } from './portalRoot'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('portalRoot', () => {
  it('falls back to the body outside the CMS layout', () => {
    expect(portalRoot()).toBe(document.body)
  })

  it('targets the CMS wrapper so dialogs keep its scoped styles', () => {
    document.body.innerHTML = '<div class="admin-root"></div>'
    expect(portalRoot()).toBe(document.querySelector('.admin-root'))
  })
})
