import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      '.next/**',
      '.worktrees/**',
      'apps/**',
      'packages/**',
      'admin/**',
      'lib/server/generated/**',
      'tests/visual/reference/**',
      'test-results/**',
      'coverage/**',
      'playwright-report/**',
      'next-env.d.ts',
    ],
  },
]

export default config
