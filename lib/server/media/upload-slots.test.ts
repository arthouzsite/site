import { describe, expect, it } from 'vitest'
import { MAX_CONCURRENT_UPLOADS } from './media.constants'
import { activeUploadCount, withUploadSlot } from './upload-slots'

const tick = () => new Promise((resolve) => setImmediate(resolve))

/** A task that stays running until released, so a test controls how long it holds its slot. */
function gatedTask() {
  let release: () => void = () => undefined
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  return { release: () => release(), run: () => withUploadSlot(() => gate) }
}

describe('withUploadSlot', () => {
  it('returns 429 TOO_MANY_UPLOADS beyond the cap instead of queueing', async () => {
    const running = Array.from({ length: MAX_CONCURRENT_UPLOADS }, gatedTask)
    const started = running.map((task) => task.run())
    await tick()
    expect(activeUploadCount()).toBe(MAX_CONCURRENT_UPLOADS)

    const error = await withUploadSlot(async () => 'never').catch((e: unknown) => e)
    expect(error).toMatchObject({ status: 429, code: 'TOO_MANY_UPLOADS' })

    running.forEach((task) => task.release())
    await Promise.all(started)
    expect(activeUploadCount()).toBe(0)
  })

  it('frees a slot when an upload finishes', async () => {
    const running = Array.from({ length: MAX_CONCURRENT_UPLOADS }, gatedTask)
    const started = running.map((task) => task.run())
    await tick()
    running[0]!.release()
    await started[0]
    await expect(withUploadSlot(async () => 'next')).resolves.toBe('next')
    running.slice(1).forEach((task) => task.release())
    await Promise.all(started)
  })

  it('frees the slot when the task fails', async () => {
    for (let i = 0; i < MAX_CONCURRENT_UPLOADS + 2; i += 1) {
      await expect(withUploadSlot(() => Promise.reject(new Error('db down')))).rejects.toThrow('db down')
    }
    expect(activeUploadCount()).toBe(0)
  })
})
