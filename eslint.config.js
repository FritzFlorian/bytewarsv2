import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import boundaries from 'eslint-plugin-boundaries'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Allow underscore-prefixed names to mark intentionally unused variables/params.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    plugins: {
      boundaries,
    },
    settings: {
      'boundaries/elements': [
        { type: 'logic', pattern: ['src/logic/**'] },
        { type: 'ui', pattern: ['src/ui/**'] },
        { type: 'render', pattern: ['src/render/**'] },
        { type: 'content', pattern: ['src/content/**'] },
        { type: 'styles', pattern: ['src/styles/**'] },
      ],
    },
    rules: {
      // Layer separation: logic must not import ui or render; render must not import ui
      'boundaries/dependencies': [
        'error',
        {
          default: 'allow',
          rules: [
            {
              from: { type: 'logic' },
              disallow: { to: { type: ['ui', 'render'] } },
            },
            {
              from: { type: 'render' },
              disallow: { to: { type: 'ui' } },
            },
          ],
        },
      ],
    },
  },
  {
    // Ban Math.random() and React/DOM imports in src/logic/
    files: ['src/logic/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message:
            'Math.random() is banned in the logic layer. Use the seeded RNG from src/logic/rng.ts.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*'],
              message: 'Logic layer must not import React.',
            },
            {
              group: ['*/ui/*', '*/ui'],
              message: 'Logic layer must not import from the UI layer.',
            },
            {
              group: ['*/render/*', '*/render'],
              message: 'Logic layer must not import from the render layer.',
            },
          ],
        },
      ],
    },
  },
  {
    // Render layer must not import from ui internals
    files: ['src/render/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['*/ui/*', '*/ui'],
              message:
                'Render layer must not import from the UI layer internals.',
            },
          ],
        },
      ],
    },
  },
  {
    // UI layer must only import render internals via the public entry point
    // (src/render/CombatScene/index.ts). Direct imports into render sub-paths
    // are banned to preserve the layer boundary defined in T-0.4.
    files: ['src/ui/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['*/render/*/*', '*/render/*/'],
              message:
                'UI layer must not import render internals directly. ' +
                'Import from the public entry point: src/render/CombatScene/index.ts.',
            },
          ],
        },
      ],
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
)
