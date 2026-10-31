import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import globals from 'globals'

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      '.next/**',
      '.next-*/**',
      '.worktrees/**',
      'lib/server/generated/**',
      'tests/visual/reference/**',
      'test-results/**',
      'coverage/**',
      'playwright-report/**',
      'next-env.d.ts',
    ],
  },
  {
    // The CMS: a client-rendered React Router app, so browser globals and the a11y rules apply; no native dialogs.
    files: ['admin/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    // The react-hooks and jsx-a11y plugins are already registered by eslint-config-next; only their rules are set here.
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-alert': 'error',
      'no-restricted-globals': ['error', 'confirm', 'alert', 'prompt'],
    },
  },
]

export default config
