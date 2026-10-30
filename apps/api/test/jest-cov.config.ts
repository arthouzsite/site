import type { Config } from 'jest'

const COVERAGE_THRESHOLD_PERCENT = 80

/**
 * Coverage gate for the API: unit specs (src/**\/*.spec.ts) and the e2e specs (test/**\/*.e2e-spec.ts) run
 * as two jest projects so one combined number is reported and checked. Needs the test database (see
 * test/setup-env.ts), so run it with --runInBand: `pnpm test:cov`.
 */
const config: Config = {
  rootDir: '..',
  projects: ['<rootDir>/jest.config.ts', '<rootDir>/test/jest-e2e.config.ts'],
  passWithNoTests: true,
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/generated/**', '!src/main.ts', '!src/**/*.spec.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text-summary', 'text', 'lcov'],
  coverageThreshold: {
    global: {
      lines: COVERAGE_THRESHOLD_PERCENT,
      functions: COVERAGE_THRESHOLD_PERCENT,
      branches: COVERAGE_THRESHOLD_PERCENT,
      statements: COVERAGE_THRESHOLD_PERCENT,
    },
  },
}

export default config
