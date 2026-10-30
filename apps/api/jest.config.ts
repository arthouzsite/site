import type { Config } from 'jest'

const COVERAGE_THRESHOLD_PERCENT = 80

const config: Config = {
  rootDir: '.',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  testRegex: 'src/.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  collectCoverage: false,
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts', '!src/generated/**', '!src/**/*.module.ts'],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      lines: COVERAGE_THRESHOLD_PERCENT,
      functions: COVERAGE_THRESHOLD_PERCENT,
      branches: COVERAGE_THRESHOLD_PERCENT,
      statements: COVERAGE_THRESHOLD_PERCENT,
    },
  },
  passWithNoTests: true,
}

export default config
