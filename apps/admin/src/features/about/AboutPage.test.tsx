import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SETTING_DEFAULTS } from '@arthouz/shared'
import { API_URL, HttpResponse, envelope, errorEnvelope, http, server } from '../../test/msw'
import { renderPage, signIn } from '../settings/testUtils'
import AboutPage from './AboutPage'

function setup(initial = '/about', role: 'ADMIN' | 'EDITOR' = 'ADMIN') {
  signIn(role)
  const puts: Array<{ key: string; value: unknown }> = []
  server.use(
    http.get(`${API_URL}/settings`, () =>
      HttpResponse.json(envelope({ ...SETTING_DEFAULTS, 'about.gallery': { statement: 'Original', body: '', locationsLabel: '', imageId: null } })),
    ),
    http.put(`${API_URL}/settings/:key`, async ({ params, request }) => {
      const { value } = (await request.json()) as { value: unknown }
      puts.push({ key: String(params.key), value })
      return HttpResponse.json(envelope(value))
    }),
  )
  renderPage(<AboutPage />, initial)
  return puts
}

describe('AboutPage', () => {
  it('has no subtitle repeating the tab names', async () => {
    setup()
    await screen.findByRole('textbox', { name: 'Statement' })
    expect(screen.queryByText(/Four tabs/)).not.toBeInTheDocument()
  })

  it('about tab switch keeps unsaved changes per tab', async () => {
    setup()
    const user = userEvent.setup()
    const statement = await screen.findByRole('textbox', { name: 'Statement' })
    await user.clear(statement)
    await user.type(statement, 'Edited statement')
    expect(screen.getByRole('tab', { name: 'Gallery (unsaved changes)' })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Proprietor' }))
    expect(screen.getByRole('tabpanel', { name: 'Proprietor' })).toBeVisible()
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Vincent')

    await user.click(screen.getByRole('tab', { name: /Gallery/ }))
    expect(screen.getByRole('textbox', { name: 'Statement' })).toHaveValue('Edited statement')
    await user.click(screen.getByRole('tab', { name: /Proprietor/ }))
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Vincent')
  })

  it('lets an EDITOR save an About section', async () => {
    const puts = setup('/about?tab=services', 'EDITOR')
    const user = userEvent.setup()
    await user.type(await screen.findByRole('textbox', { name: 'Title' }), 'Framing')
    await user.click(screen.getByRole('button', { name: 'Save section' }))
    await waitFor(() => expect(puts[0]?.key).toBe('about.services'))
  })

  it('saves a section to its own setting and clears the unsaved mark', async () => {
    const puts = setup('/about?tab=services')
    const user = userEvent.setup()
    expect(await screen.findByRole('tab', { name: 'Services' })).toHaveAttribute('aria-selected', 'true')
    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Framing')
    await user.click(screen.getByRole('button', { name: 'Save section' }))
    await waitFor(() => expect(puts).toEqual([{ key: 'about.services', value: { title: 'Framing', body: '', ctaLabel: '', imageId: null } }]))
    expect(await screen.findByRole('tab', { name: 'Services' })).toBeInTheDocument()
  })

  it('rejects an invalid publications URL and saves an empty one as null', async () => {
    const puts = setup('/about?tab=publications')
    const user = userEvent.setup()
    const url = await screen.findByRole('textbox', { name: 'External URL' })
    await user.type(url, 'not a url')
    await user.click(screen.getByRole('button', { name: 'Save section' }))
    expect(await screen.findAllByText('Enter a full web address, starting with https://')).not.toHaveLength(0)
    expect(puts).toEqual([])
    await user.clear(url)
    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Arts Illustrated')
    await user.click(screen.getByRole('button', { name: 'Save section' }))
    await waitFor(() => expect(puts[0]?.value).toMatchObject({ title: 'Arts Illustrated', externalUrl: null }))
  })

  it('reports a failed save and keeps the changes', async () => {
    setup()
    server.use(http.put(`${API_URL}/settings/:key`, () => HttpResponse.json(errorEnvelope('UNKNOWN_MEDIA', 'That image no longer exists'), { status: 400 })))
    const user = userEvent.setup()
    await user.type(await screen.findByRole('textbox', { name: 'Body' }), 'More')
    await user.click(screen.getByRole('button', { name: 'Save section' }))
    expect(await screen.findByText('That image no longer exists')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Body' })).toHaveValue('More')
  })

  it('falls back to the gallery tab for an unknown ?tab=', async () => {
    setup('/about?tab=nope')
    expect(await screen.findByRole('tab', { name: 'Gallery' })).toHaveAttribute('aria-selected', 'true')
  })
})
