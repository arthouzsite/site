import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const COVERAGE_THRESHOLD_PERCENT = 80
const REPO_ROOT = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'hooks/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}'],
      exclude: ['lib/server/**', 'lib/shared/**', 'admin/**', 'tests/**', '**/*.d.ts'],
      thresholds: {
        lines: COVERAGE_THRESHOLD_PERCENT,
        functions: COVERAGE_THRESHOLD_PERCENT,
        branches: COVERAGE_THRESHOLD_PERCENT,
        statements: COVERAGE_THRESHOLD_PERCENT,
      },
    },
    projects: [
      {
        resolve: { alias: { '@': REPO_ROOT } },
        test: {
          name: 'site',
          environment: 'node',
          include: ['tests/unit/**/*.test.{ts,tsx}'],
        },
      },
    ],
  },
})
