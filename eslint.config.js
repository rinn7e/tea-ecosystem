import js from '@eslint/js'
import importPlugin from 'eslint-plugin-import'
import reactDom from 'eslint-plugin-react-dom'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import reactX from 'eslint-plugin-react-x'
import unusedImports from 'eslint-plugin-unused-imports'
import { globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// The move maker (code-convention.md, "Make Impossible Updates Impossible"):
// the branded screen model stops any other write, but not a call to its
// exported maker. Only a move opens a screen: the navigation
// (`navigation-handler.ts`) and tests call it. The file defining it is left
// out.
const moveMakerFiles = ['src/type.ts']
const moveMakerUsers = ['src/handler/navigation-handler.ts', 'tests/**/*.ts']
// By name, so a namespace use (`Type.currentScreenModelOfMove`) and a computed
// access (`m['currentScreenModelOfMove']`) are caught too
const moveMakerUses = (makers) =>
  [
    `Identifier[name=/^(${makers.join('|')})$/]`,
    `Literal[value=/^(${makers.join('|')})$/]`,
  ].map((selector) => ({
    selector,
    message:
      'A move is made only by the navigation (`navigation-handler.ts`): navigate instead.',
  }))

// Import fp-ts and io-ts modules by name ('fp-ts/Option'), so the bundler
// picks their tree-shakeable ES module build
const fpTsModulePatterns = [
  {
    group: ['fp-ts/lib/*', 'fp-ts/es6/*', 'io-ts/lib/*', 'io-ts/es6/*'],
    message: "Import from 'fp-ts/<Module>' instead.",
  },
]

// The URL is a thin wrapper (code-convention.md, "No update wrapper (and the
// URL exception)"): only `browser-history.ts` touches the history, the
// location and the Navigation API of the browser, and only the URL writer of
// the program (`src/util/url.ts`) calls its writes, from the destination
// after a step. The view, a handler or a command never writes the URL.
const browserHistoryFile = 'src/common/util/browser-history.ts'
const urlWriterFiles = ['src/util/url.ts', 'src/common/util/index.ts']
const urlWrites = ['pushUrl', 'replaceUrl', 'backOrPushUrl']
const browserHistoryMessage =
  'Only `browser-history.ts` touches the history and the location of the browser: the URL follows the destination (`urlWriterOf`).'

export default tseslint.config([
  // The examples of `data/snippet/` are copied from the docs of each project
  // and shown as text, not built; local tools may keep extra worktrees under
  // `.claude/` (as in `vite.config.ts`)
  globalIgnores(['dist', 'dist-ssr', 'data/snippet', '.claude']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },

    plugins: {
      import: importPlugin,
      'unused-imports': unusedImports,
    },

    rules: {
      'no-else-return': 'off',
      'no-lonely-if': 'off',
      'no-control-regex': 'off',
      'import/no-cycle': [2, { ignoreExternal: true }],
      'import/no-duplicates': ['error', { 'prefer-inline': true }],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        {
          assertionStyle: 'never',
        },
      ],

      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'no-restricted-imports': ['error', { patterns: fpTsModulePatterns }],
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      'react-x/no-use-context': 'off',
      'react-x/no-forward-ref': 'off',
      'react-x/no-array-index-key': 'off',

      'react-dom/no-dangerously-set-innerhtml': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: [...moveMakerFiles, ...moveMakerUsers],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...moveMakerUses(['currentScreenModelOfMove']),
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: [browserHistoryFile],
    rules: {
      'no-restricted-globals': [
        'error',
        ...['history', 'location', 'navigation'].map((name) => ({
          name,
          message: browserHistoryMessage,
        })),
      ],
      'no-restricted-properties': [
        'error',
        ...['history', 'location', 'navigation'].map((property) => ({
          object: 'window',
          property,
          message: browserHistoryMessage,
        })),
      ],
    },
  },
  {
    // Replaces the rule of the block above for these files, so it carries
    // the fp-ts patterns too
    files: ['**/*.{ts,tsx}'],
    ignores: [browserHistoryFile, ...urlWriterFiles],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...fpTsModulePatterns,
            {
              group: ['@/common/util', '**/common/util/browser-history'],
              importNames: urlWrites,
              message:
                'Only the URL writer of the program (`urlWriterOf`) writes the URL: change the destination instead.',
            },
          ],
        },
      ],
    },
  },
  {
    // Drawn once by the build (`scripts/prerender.mjs`), never by the dev
    // server, so fast refresh plays no part in them
    files: ['src/prerender.tsx', 'src/share-card.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
