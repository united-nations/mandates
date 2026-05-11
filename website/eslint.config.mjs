import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier/flat'
import { defineConfig, globalIgnores } from 'eslint/config'

const eslintConfig = defineConfig([
  // Next.js Core Web Vitals rules
  ...nextVitals,

  // TypeScript-specific rules
  ...nextTs,

  // Prettier integration (disables conflicting ESLint formatting rules)
  prettier,

  // Custom rule overrides
  {
    rules: {
      // Allow console.log in development (useful for debugging)
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Disable some overly strict rules for better DX
      'react/no-unescaped-entities': 'off',
      '@next/next/no-img-element': 'warn', // Warn instead of error
    },
  },

  // Override default ignores of eslint-config-next
  globalIgnores([
    // Next.js build outputs
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',

    // Dependencies
    'node_modules/**',

    // Cache and logs
    '.cache/**',
    '*.log',

    // OS files
    '.DS_Store',

    // IDE files
    '.vscode/**',
    '.idea/**',

    // Data files
    'data/**',
    'public/data/**',
  ]),
])

export default eslintConfig
