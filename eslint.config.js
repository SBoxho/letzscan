import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.wrangler/**',
      '**/coverage/**',
      'pipeline/**',
      'notebooks/**',
      'schemas/**',
    ],
  },

  js.configs.recommended,
  tseslint.configs.recommended,
  prettier,

  {
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      eqeqeq: ['error', 'smart'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // Web application ---------------------------------------------------------
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // Configuration must flow through one audited module so that it stays obvious
    // which values are shipped to the browser. See docs/adr/0004.
    files: ['apps/web/src/**/*.{ts,tsx}'],
    ignores: ['apps/web/src/lib/env.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.type='MetaProperty'][property.name='env']",
          message:
            'Do not read import.meta.env directly. Use src/lib/env.ts so browser-exposed configuration stays auditable.',
        },
      ],
    },
  },

  // Cloudflare Worker -------------------------------------------------------
  {
    files: ['apps/edge/**/*.ts'],
    languageOptions: {
      globals: { ...globals.worker },
    },
  },

  // Tests and build scripts ------------------------------------------------
  {
    files: ['**/*.test.{ts,tsx}', '**/test/**/*.{ts,tsx}', '**/scripts/**/*.{ts,mjs,js}'],
    rules: {
      'no-console': 'off',
    },
  },
);
