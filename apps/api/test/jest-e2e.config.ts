import type { Config } from 'jest'

const config: Config = {
  rootDir: '..',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  testRegex: 'test/.*\\.e2e-spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  testTimeout: 30000,
}

export default config
