// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PrintGrid } from '@/components/prints/PrintGrid'
import { APP_ROOT_ID } from '@/lib/dom'

const images = [
  { url: 'https://cdn.test/a.jpg', thumbUrl: 'https://cdn.test/a-t.jpg', width: 800, height: 1000, alt: 'Harbour at dusk' },
  { url: 'https://cdn.test/b.jpg', thumbUrl: 'https://cdn.test/b-t.jpg', width: 800, height: 1000, alt: 'Misty hills' },
]

const fetchMock = vi.fn<typeof fetch>()
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const challenge = (token: string) => reply(200, { ok: true, data: { token, image: '<svg xmlns="http://www.w3.org/2000/svg"/>' }, error: null })
const urlOf = (input: Parameters<typeof fetch>[0]) => (typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
const posts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')
const postedBody = () => JSON.parse(String(posts()[0]?.[1]?.body)) as Record<string, unknown>

/** Answers every challenge request with the next token and every submission with `submission()`. */
function serve(submission: () => Response) {
  let issued = 0
  fetchMock.mockImplementation(async (input) => (urlOf(input).endsWith('/api/auth/captcha') ? challenge(`token-${++issued}`) : submission()))
}

async function openOrder(index = 1) {
  const user = userEvent.setup()
  render(
    <div id={APP_ROOT_ID}>
      <PrintGrid slug="etchings" title="Etchings" images={images} />
    </div>,
  )
  await user.click(screen.getByRole('button', { name: `View ${images[index]!.alt}` }))
  await user.click(screen.getByRole('button', { name: 'Order' }))
  await screen.findByRole('img', { name: 'Security code' })
  return user
}

const field = (name: string) => screen.getByRole('textbox', { name: new RegExp(`^${name}`) })

async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.type(field('Name'), 'Asha Rao')
  await user.type(field('Email'), 'asha@example.com')
  await user.type(field('Mobile number'), '98765 43210')
  await user.type(field('Security code'), 'ace23')
}

describe('print order', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('opens the order form for the print on show and returns to the viewer on Close', async () => {
    serve(() => reply(201, { ok: true, data: { received: true }, error: null }))
    const user = await openOrder()
    const dialog = screen.getByRole('dialog', { name: 'Etchings' })
    expect(dialog.textContent).toContain('Order this print')
    expect(within(dialog).getByRole('img', { name: 'Misty hills' })).toBeTruthy()
    expect(document.activeElement).toBe(field('Name'))
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.getByRole('button', { name: 'Order' })).toBeTruthy()
    expect(screen.getByText('2 / 2')).toBeTruthy()
  })

  it('sends the order with the print and the answered challenge, then says the team will be in touch', async () => {
    serve(() => reply(201, { ok: true, data: { received: true }, error: null }))
    const user = await openOrder()
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Place order request' }))
    expect((await screen.findByRole('status')).textContent).toContain('Our team will contact you shortly about this print.')
    expect(postedBody()).toEqual({
      kind: 'PRINT', slug: 'etchings', imageUrl: 'https://cdn.test/b.jpg', name: 'Asha Rao', mobile: '+919876543210', email: 'asha@example.com',
      message: '', refCode: '', captchaToken: 'token-1', captcha: 'ace23',
    })
  })

  it('shows what is missing without sending anything', async () => {
    serve(() => reply(201, { ok: true, data: { received: true }, error: null }))
    const user = await openOrder()
    await user.click(screen.getByRole('button', { name: 'Place order request' }))
    expect(screen.getByText('Enter your name')).toBeTruthy()
    expect(screen.getByText('Enter your email')).toBeTruthy()
    expect(screen.getByText('Enter your mobile number')).toBeTruthy()
    expect(screen.getByText('Enter the security code')).toBeTruthy()
    expect(document.activeElement).toBe(field('Name'))
    expect(posts()).toHaveLength(0)
  })

  it('shows a refused security code on its field, clears the answer and loads a new picture', async () => {
    const message = 'The security code does not match. Try the new one.'
    serve(() => reply(400, { ok: false, data: null, error: { code: 'CAPTCHA_INVALID', message, fields: { captcha: message } } }))
    const user = await openOrder()
    await fill(user)
    await user.click(screen.getByRole('button', { name: 'Place order request' }))
    expect(await screen.findByText(message)).toBeTruthy()
    expect((field('Security code') as HTMLInputElement).value).toBe('')
    await waitFor(() => expect(fetchMock.mock.calls.filter(([input]) => urlOf(input).endsWith('/api/auth/captcha'))).toHaveLength(2))
    expect((field('Name') as HTMLInputElement).value).toBe('Asha Rao')
  })

  it('swaps the picture for another one on New code', async () => {
    serve(() => reply(201, { ok: true, data: { received: true }, error: null }))
    const user = await openOrder()
    await user.type(field('Security code'), 'abc')
    await user.click(screen.getByRole('button', { name: 'New code' }))
    expect((field('Security code') as HTMLInputElement).value).toBe('')
    await screen.findByRole('img', { name: 'Security code' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('says so when the security code cannot load and keeps the order from being sent', async () => {
    fetchMock.mockRejectedValue(new Error('offline'))
    const user = userEvent.setup()
    render(
      <div id={APP_ROOT_ID}>
        <PrintGrid slug="etchings" title="Etchings" images={images} />
      </div>,
    )
    await user.click(screen.getByRole('button', { name: 'View Harbour at dusk' }))
    await user.click(screen.getByRole('button', { name: 'Order' }))
    expect(await screen.findByText('The security code could not load.')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Place order request' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
