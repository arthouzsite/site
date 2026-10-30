import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  { ignores: ['.next/**', 'reference/**', 'test-results/**', 'coverage/**', 'playwright-report/**', 'next-env.d.ts'] },
]

export default config
