// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EnquiryTrigger } from '@/components/enquiry/EnquiryTrigger'
import { PRIMARY_BUTTON_CLASS } from '@/components/site/PrimaryButton'
import { APP_ROOT_ID } from '@/lib/dom'
import { todayInKolkata } from '@/lib/shared'

const MS_PER_DAY = 86_400_000
const day = (offset: number) => new Date(todayInKolkata().getTime() + offset * MS_PER_DAY).toISOString().slice(0, 10)

const service = { kind: 'SERVICE', slug: 'photo-shoots', title: 'Photo shoots', locations: ['Chennai', 'Bengaluru'] } as const
const artist = { kind: 'ARTIST', slug: 'vijay', name: 'Vijay Pichumani' } as const

const fetchMock = vi.fn<typeof fetch>()
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const accepted = () => reply(201, { ok: true, data: { received: true }, error: null })
const rejected = (status: number, code: string, message: string, fields?: Record<string, string>) =>
  reply(status, { ok: false, data: null, error: fields ? { code, message, fields } : { code, message } })

function renderTrigger(target: typeof service | typeof artist, label = 'Enquire →') {
  const user = userEvent.setup()
  render(
    <div id={APP_ROOT_ID}>
      <EnquiryTrigger label={label} target={target} />
    </div>,
  )
  return { user, button: screen.getByRole('button', { name: label }) }
}

async function openDialog(target: typeof service | typeof artist) {
  const opened = renderTrigger(target)
  await opened.user.click(opened.button)
  return opened
}

const field = (name: string) => screen.getByRole(name === 'Location' ? 'combobox' : 'textbox', { name: new RegExp(`^${name}`) })
const postedBody = () => JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<string, unknown>

async function fillContact(user: ReturnType<typeof userEvent.setup>) {
  await user.type(field('Name'), 'Asha Rao')
  await user.type(field('Mobile'), '98765 43210')
  await user.type(field('Email'), 'asha@example.com')
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(window, 'alert').mockImplementation(() => undefined)
  vi.spyOn(window, 'confirm').mockImplementation(() => true)
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('EnquiryTrigger', () => {
  it('renders a button that looks like the primary link and opens a dialog', async () => {
    const { user, button } = renderTrigger(service)
    expect(button.tagName).toBe('BUTTON')
    expect(button.getAttribute('type')).toBe('button')
    expect(button.getAttribute('aria-haspopup')).toBe('dialog')
    expect(button.className).toContain(PRIMARY_BUTTON_CLASS)
    expect(screen.queryByRole('dialog')).toBeNull()

    await user.click(button)

    expect(screen.getByRole('dialog', { name: 'Enquire: Photo shoots' })).toBeTruthy()
    expect(document.activeElement).toBe(field('Name'))
    expect(document.getElementById(APP_ROOT_ID)?.hasAttribute('inert')).toBe(true)
  })

  it('closes on Escape and on Close, returning focus to the button', async () => {
    const { user, button } = await openDialog(artist)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(button)

    await user.click(button)
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(button)
  })

  it('keeps Tab inside the dialog', async () => {
    const { user } = await openDialog(artist)
    const dialog = screen.getByRole('dialog')
    for (let press = 0; press < 12; press += 1) {
      await user.tab()
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
  })
})

describe('service enquiry form', () => {
  it('has labelled fields, the gallery locations and no artist field', async () => {
    await openDialog(service)
    for (const label of ['Name', 'Mobile', 'Email', 'Date from', 'Date to', 'Purpose', 'Message']) {
      expect(screen.getByLabelText(new RegExp(`^${label}`))).toBeTruthy()
    }
    const options = Array.from(field('Location').querySelectorAll('option')).map((option) => option.textContent)
    expect(options).toEqual(['Select', 'Chennai', 'Bengaluru'])
    expect(screen.queryByLabelText('Artist')).toBeNull()
    expect(screen.getByLabelText(/^Message/).closest('div')?.textContent).toContain('Optional')
  })

  it('shows an inline error per field, marks them invalid and focuses the first, without posting', async () => {
    const { user } = await openDialog(service)
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }))

    for (const message of ['Enter your name', 'Enter your mobile number', 'Enter your email', 'Choose a start date', 'Choose an end date', 'Enter the purpose', 'Choose a location']) {
      expect(screen.getByText(message)).toBeTruthy()
    }
    expect(field('Name').getAttribute('aria-invalid')).toBe('true')
    expect(field('Name').getAttribute('aria-describedby')).toBe(screen.getByText('Enter your name').id)
    expect(document.activeElement).toBe(field('Name'))
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('clears a field error when the field is edited', async () => {
    const { user } = await openDialog(artist)
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }))
    expect(screen.getByText('Enter your name')).toBeTruthy()
    await user.type(field('Name'), 'A')
    expect(screen.queryByText('Enter your name')).toBeNull()
    expect(field('Name').getAttribute('aria-invalid')).toBeNull()
  })

  it('rejects an end date before the start date and a start date in the past', async () => {
    const { user } = await openDialog(service)
    await fillContact(user)
    await user.type(field('Purpose'), 'Photography')
    await user.selectOptions(field('Location'), 'Chennai')
    const dateFrom = screen.getByLabelText(/^Date from/)
    const dateTo = screen.getByLabelText(/^Date to/)

    await user.type(dateFrom, day(5))
    await user.type(dateTo, day(2))
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }))
    expect(screen.getByText('Date to cannot be before date from')).toBeTruthy()

    await user.clear(dateFrom)
    await user.type(dateFrom, day(-2))
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }))
    expect(screen.getByText('Date from cannot be in the past')).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts the validated enquiry and replaces the form with a focused confirmation', async () => {
    fetchMock.mockResolvedValueOnce(accepted())
    const { user } = await openDialog(service)
    await fillContact(user)
    await user.type(screen.getByLabelText(/^Date from/), day(3))
    await user.type(screen.getByLabelText(/^Date to/), day(5))
    await user.type(field('Purpose'), 'Photography')
    await user.selectOptions(field('Location'), 'Bengaluru')
    await user.type(field('Message'), 'Hello there')
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }))

    const status = await screen.findByRole('status')
    expect(status.textContent).toContain('Thank you')
    expect(document.activeElement).toBe(status)
    expect(screen.queryByRole('button', { name: 'Send enquiry' })).toBeNull()
    expect(screen.queryByLabelText(/^Name/)).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/public/enquiries')
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST')
    expect(postedBody()).toEqual({
      kind: 'SERVICE', slug: 'photo-shoots', name: 'Asha Rao', mobile: '+919876543210', email: 'asha@example.com', message: 'Hello there',
      refCode: '', dateFrom: day(3), dateTo: day(5), purpose: 'Photography', location: 'Bengaluru',
    })
    expect(window.alert).not.toHaveBeenCalled()
    expect(window.confirm).not.toHaveBeenCalled()
  })
})

describe('artist enquiry form', () => {
  it('shows the artist as a fixed field and only the contact fields', async () => {
    await openDialog(artist)
    const fixed = screen.getByLabelText('Artist') as HTMLInputElement
    expect(fixed.value).toBe('Vijay Pichumani')
    expect(fixed.readOnly).toBe(true)
    for (const label of ['Date from', 'Date to', 'Purpose', 'Location']) expect(screen.queryByLabelText(new RegExp(`^${label}`))).toBeNull()
  })

  it('posts an artist enquiry without service fields', async () => {
    fetchMock.mockResolvedValueOnce(accepted())
    const { user } = await openDialog(artist)
    await fillContact(user)
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }))
    await screen.findByRole('status')
    expect(postedBody()).toEqual({ kind: 'ARTIST', slug: 'vijay', name: 'Asha Rao', mobile: '+919876543210', email: 'asha@example.com', message: '', refCode: '' })
  })

  it('never traps focus on the honeypot, even while the submit button is disabled', async () => {
    fetchMock.mockReturnValueOnce(new Promise<Response>(() => undefined))
    const { user } = await openDialog(artist)
    await fillContact(user)
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }))
    expect((screen.getByRole('button', { name: 'Sending…' }) as HTMLButtonElement).disabled).toBe(true)
    const home = screen.getByRole('link', { name: 'Art Houz home' })
    home.focus()
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(field('Message'))
    await user.tab()
    expect(document.activeElement).toBe(home)
  })

  it('keeps the honeypot out of reach of people and assistive tech', async () => {
    await openDialog(artist)
    const trap = document.querySelector<HTMLInputElement>('input[name="refCode"]')
    expect(trap?.tabIndex).toBe(-1)
    expect(trap?.closest('[aria-hidden="true"]')).toBeTruthy()
  })
})

describe('submission failures', () => {
  async function submitArtist() {
    const { user } = await openDialog(artist)
    await fillContact(user)
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }))
  }

  it('maps server field errors onto the fields and keeps what was typed', async () => {
    fetchMock.mockResolvedValueOnce(rejected(400, 'VALIDATION', 'Some fields need attention', { email: 'Enter a valid email address' }))
    await submitArtist()
    expect(await screen.findByText('Enter a valid email address')).toBeTruthy()
    expect((field('Name') as HTMLInputElement).value).toBe('Asha Rao')
    expect(document.activeElement).toBe(field('Email'))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows the server message for a rate limit and lets the visitor retry', async () => {
    fetchMock.mockResolvedValueOnce(rejected(429, 'RATE_LIMITED', 'Too many enquiries from your network. Please try again in a few minutes.'))
    await submitArtist()
    expect((await screen.findByRole('alert')).textContent).toContain('Too many enquiries')
    expect((screen.getByRole('button', { name: 'Send enquiry' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('shows a generic message when the network fails, without leaking the cause', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('socket hang up at 10.0.0.1'))
    await submitArtist()
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('could not reach the server')
    expect(alert.textContent).not.toContain('10.0.0.1')
  })

  it('disables the button while sending, so a double click posts once', async () => {
    let finish: (value: Response) => void = () => undefined
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => { finish = resolve }))
    const { user } = await openDialog(artist)
    await fillContact(user)
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }))
    const sending = screen.getByRole('button', { name: 'Sending…' }) as HTMLButtonElement
    expect(sending.disabled).toBe(true)
    await user.click(sending)
    finish(accepted())
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy())
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
