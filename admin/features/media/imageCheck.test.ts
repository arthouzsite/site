import { describe, expect, it } from 'vitest'
import { checkImageFile } from './imageCheck'

const MB = 1024 * 1024
const image = (name: string, size: number, type = 'image/jpeg') => new File([new Uint8Array(size)], name, { type })
const size = (width: number, height: number) => async () => ({ width, height })

describe('checkImageFile', () => {
  it('passes an image within both limits', async () => {
    expect(await checkImageFile(image('ok.jpg', 100), size(4000, 3000))).toBeNull()
  })

  it('rejects an oversized file without decoding it', async () => {
    let read = false
    const message = await checkImageFile(image('big.jpg', 2 * MB + 1), async () => { read = true; return { width: 10, height: 10 } })
    expect(message).toContain('big.jpg')
    expect(message).toContain('2 MB')
    expect(read).toBe(false)
  })

  it('rejects a long edge over 4000 px, whichever side it is', async () => {
    expect(await checkImageFile(image('w.jpg', 100), size(4001, 10))).toMatch(/w\.jpg.*4000 px/)
    expect(await checkImageFile(image('h.jpg', 100), size(10, 4001))).toMatch(/h\.jpg.*4000 px/)
  })

  it('leaves videos to their own limits', async () => {
    expect(await checkImageFile(image('v.mp4', 5 * MB, 'video/mp4'), size(9000, 9000))).toBeNull()
  })

  it('lets the server decide when the browser cannot read the dimensions', async () => {
    expect(await checkImageFile(image('odd.avif', 100, 'image/avif'), async () => null)).toBeNull()
  })
})
