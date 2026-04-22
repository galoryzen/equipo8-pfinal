import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import i18next from 'eslint-plugin-i18next';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import { defineConfig, globalIgnores } from 'eslint/config';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    name: 'jsx-a11y/recommended',
    rules: jsxA11y.flatConfigs.recommended.rules,
  },
  {
    name: 'i18next/enforce-translations-in-ui',
    // Scope this to UI component folders where we expect i18n usage.
    // Expanding this to all `app/**` should be done incrementally to avoid
    // blocking the team on existing literal copy.
    files: ['components/{home,layout,search}/**/*.{tsx,jsx}'],
    rules: {
      // Also validate JSX attributes like placeholder/aria-label/title/value, not only plain JSX text.
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-only',
          // Only enforce user-facing attributes; skip layout/behavior props (e.g. display="flex", sx={{...}}).
          'jsx-attributes': {
            include: [
              'placeholder',
              'aria-label',
              'title',
              'alt',
              'label',
              'helperText',
              'noOptionsText',
            ],
            exclude: [],
          },
        },
      ],
    },
    plugins: { i18next },
  },
  // Disable a11y rules for test files — axe handles accessibility assertions there.
  {
    name: 'jsx-a11y/disable-in-tests',
    files: ['**/__tests__/**', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: Object.fromEntries(
      Object.keys(jsxA11y.flatConfigs.recommended.rules).map((rule) => [rule, 'off'])
    ),
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
