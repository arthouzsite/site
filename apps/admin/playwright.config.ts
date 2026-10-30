// E2E harness is wired in a later task; config kept here so the path exists.
export default {
  testDir: './e2e',
  use: { baseURL: 'http://localhost:5180' },
  webServer: { command: 'pnpm dev', url: 'http://localhost:5180', reuseExistingServer: true },
}
