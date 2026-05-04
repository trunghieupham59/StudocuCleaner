// ESLint flat config — applies to vanilla MV3 extension code under src/.
// No build step, no transpile.

import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      '.github/**',
      'docs/**',
      '.clinerules/**',
      'icons/**',
      'scripts/**',
    ],
  },

  // Popup — ES module context (browser + chrome.* APIs)
  {
    files: ['src/popup/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        chrome: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      'no-undef': 'error',
      'no-var': 'error',
      'prefer-const': 'warn',
      eqeqeq: ['error', 'smart'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // Content + viewer — classic IIFE script (no import/export)
  {
    files: ['src/content/**/*.js', 'src/viewer/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'script',
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      'no-undef': 'error',
      'no-var': 'error',
      'prefer-const': 'warn',
      eqeqeq: ['error', 'smart'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // content/viewer must NOT use ES module syntax (would break in classic script context)
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportDeclaration',
          message: 'content/viewer scripts run as classic IIFE — do not use import.',
        },
        {
          selector: 'ExportNamedDeclaration',
          message: 'content/viewer scripts run as classic IIFE — do not use export.',
        },
        {
          selector: 'ExportDefaultDeclaration',
          message: 'content/viewer scripts run as classic IIFE — do not use export default.',
        },
      ],
    },
  },
];
