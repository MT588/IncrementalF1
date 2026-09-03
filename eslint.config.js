import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist', 'node_modules', 'playwright-report', 'test-results']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // The engine is a pure simulation: no UI framework, no store, no browser services.
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['react', 'react-dom', 'zustand'],
          patterns: [
            { group: ['@/ui', '@/ui/*', '@/store', '@/store/*', '@/services', '@/services/*'] },
            { group: ['**/ui/*', '**/store/*', '**/services/*'] },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        'window',
        'document',
        'localStorage',
        'requestAnimationFrame',
      ],
    },
  },
  prettier,
]);
