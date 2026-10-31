import type { Page } from '@playwright/test'

/**
 * The accessibility suite checks structure, names and hit areas, never pixels, so it must not depend on the
 * placeholder image host being reachable: a slow or failing TLS handshake there once stalled `load` for the
 * whole test timeout. Every image from a non-local host is answered with a tiny PNG instead.
 */

// 1×1 opaque PNG.
const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

export async function stubRemoteImages(page: Page): Promise<void> {
  await page.route('**/*', async (route) => {
    const request = route.request()
    const host = new URL(request.url()).hostname
    if (LOCAL_HOSTS.has(host) || request.resourceType() !== 'image') return route.continue()
    return route.fulfill({ status: 200, contentType: 'image/png', body: ONE_PIXEL_PNG })
  })
}
