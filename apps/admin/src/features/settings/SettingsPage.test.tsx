import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SETTING_DEFAULTS } from '@arthouz/shared'
import { API_URL, HttpResponse, envelope, errorEnvelope, http, server } from '../../test/msw'
import SettingsPage from './SettingsPage'
import { renderPage, signIn, type Role } from './testUtils'

const EX_ID = '11111111-1111-4111-8111-111111111111'
const AR_ID = '22222222-2222-4222-8222-222222222222'
type Put = { key: string; value: unknown }

function setup(role: Role = 'ADMIN', failOn?: string, extra: Parameters<typeof server.use> = []) {
  signIn(role)
  const puts: Put[] = []
  server.use(
    http.get(`${API_URL}/settings`, () => HttpResponse.json(envelope({ ...SETTING_DEFAULTS, homeArtistCount: 22 }))),
    http.get(`${API_URL}/exhibitions`, () => HttpResponse.json(envelope([{ id: EX_ID, title: 'Tidewater' }]))),
    http.get(`${API_URL}/artists`, () => HttpResponse.json(envelope([{ id: AR_ID, name: 'Vijay Pichumani' }]))),
    http.put(`${API_URL}/settings/:key`, async ({ params, request }) => {
      const body = (await request.json()) as { value: unknown }
      if (params.key === failOn) return HttpResponse.json(errorEnvelope('UNKNOWN_EXHIBITION', 'That exhibition no longer exists'), { status: 400 })
      puts.push({ key: String(params.key), value: body.value })
      return HttpResponse.json(envelope(body.value))
    }),
  )
  server.use(...extra)
  renderPage(<SettingsPage />)
  return puts
}

const card = (name: string) => within(screen.getByRole('region', { name }))

describe('SettingsPage', () => {
  it('settings hero radio PUTs heroLayout', async () => {
    const puts = setup()
    const user = userEvent.setup()
    await screen.findByRole('radio', { name: 'Split' })
    await user.click(screen.getByRole('radio', { name: 'Split' }))
    await user.click(card('Home hero').getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(puts).toEqual([{ key: 'heroLayout', value: 'SPLIT' }]))
    expect(await screen.findByText('Saved')).toBeInTheDocument()
  })

  it('PUTs the chosen hero exhibition and null for automatic', async () => {
    const puts = setup()
    const user = userEvent.setup()
    const select = await screen.findByLabelText('Hero exhibition')
    await screen.findByRole('option', { name: 'Tidewater' })
    await user.selectOptions(select, EX_ID)
    await user.click(card('Home hero').getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(puts).toEqual([{ key: 'homeHeroExhibitionId', value: EX_ID }]))
  })

  it('homeArtistCount rejects 0', async () => {
    const puts = setup()
    const user = userEvent.setup()
    const input = await screen.findByLabelText('Number of artists')
    expect(input).toHaveValue(22)
    await user.clear(input)
    await user.type(input, '0')
    await user.click(card('Artists line on home').getByRole('button', { name: 'Save' }))
    expect(await card('Artists line on home').findAllByText('Enter a whole number from 1 to 200.')).not.toHaveLength(0)
    expect(puts).toEqual([])
    await user.clear(input)
    await user.type(input, '30')
    await user.click(card('Artists line on home').getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(puts).toEqual([{ key: 'homeArtistCount', value: 30 }]))
  })

  it('shows the renders-as help for the copyright year and saves the footer object', async () => {
    const puts = setup()
    const user = userEvent.setup()
    const year = await screen.findByLabelText('Copyright from year')
    expect(screen.getByText(`Renders as © 2026 – ${new Date().getFullYear()}`)).toBeInTheDocument()
    await user.clear(year)
    await user.type(year, '2012')
    await user.type(screen.getByLabelText('Tagline'), 'Contemporary art')
    await user.click(card('Footer').getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(puts).toHaveLength(1))
    expect(puts[0]).toMatchObject({ key: 'footer', value: { tagline: 'Contemporary art', copyrightFrom: 2012 } })
  })

  it('save settings bar saves every dirty card in sequence', async () => {
    const puts = setup()
    const user = userEvent.setup()
    await screen.findByLabelText('Number of artists')
    const bar = screen.getByRole('button', { name: 'Save settings' })
    expect(bar).toBeDisabled()
    await user.click(screen.getByRole('radio', { name: 'Flowing' }))
    await user.type(screen.getByLabelText('Title'), 'Art Houz')
    await user.click(bar)
    await waitFor(() => expect(puts.map((p) => p.key)).toEqual(['artistIndexLayout', 'site']))
    await waitFor(() => expect(bar).toBeDisabled())
  })

  it('selects an artist in focus and surfaces server reference errors', async () => {
    setup('ADMIN', 'homeFocus')
    const user = userEvent.setup()
    await screen.findByRole('option', { name: 'Vijay Pichumani' })
    await user.selectOptions(screen.getByLabelText('Artist'), AR_ID)
    await user.click(card('Artist in focus').getByRole('button', { name: 'Save' }))
    expect(await card('Artist in focus').findByRole('alert')).toHaveTextContent('That exhibition no longer exists')
    expect(await screen.findByText('Could not save. Try again.')).toBeInTheDocument()
  })

  it('previews the saved social image and lets it be removed', async () => {
    const puts = setup('ADMIN', undefined, [
      http.get(`${API_URL}/settings`, () => HttpResponse.json(envelope({ ...SETTING_DEFAULTS, site: { title: 'Art Houz', description: '', ogImageId: EX_ID } }))),
      http.get(`${API_URL}/media/${EX_ID}`, () =>
        HttpResponse.json(envelope({ id: EX_ID, url: 'https://cdn.example/og.jpg', thumbUrl: 'https://cdn.example/og-t.jpg', width: 1200, height: 800, alt: 'Share card', usedBy: [] })),
      ),
    ])
    const user = userEvent.setup()
    expect(await screen.findByRole('img', { name: 'Share card' })).toHaveAttribute('src', 'https://cdn.example/og.jpg')
    await user.click(screen.getByRole('button', { name: 'Remove' }))
    await user.click(card('Site').getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(puts).toEqual([{ key: 'site', value: { title: 'Art Houz', description: '', ogImageId: null } }]))
  })

  it('settings save hidden for EDITOR (read-only view with a note)', async () => {
    setup('EDITOR')
    expect(await screen.findByText('Only administrators can change these settings.')).toBeInTheDocument()
    expect(await screen.findByLabelText('Number of artists')).toBeDisabled()
    expect(screen.getByLabelText('Tagline')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save settings' })).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Split' })).toBeDisabled()
  })
})
