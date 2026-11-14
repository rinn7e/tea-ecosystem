import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import { configDefaults } from 'vitest/config'

// The time of the last commit of the repository (ISO 8601): the site is
// built on every push to `master`, so it is when the site and its data
// last changed. Now when git cannot tell (no repository around).
const lastUpdatedTime = (): string => {
  try {
    return execSync('git log -1 --format=%cI', { encoding: 'utf8' }).trim()
  } catch {
    return new Date().toISOString()
  }
}

// A static site on GitHub Pages: `VITE_BASE_URL` is the project path there
// (`.env.production`), and the build copies `index.html` to `404.html` so a
// deep link opens the app too
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: env.VITE_BASE_URL ?? '/',
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_LAST_UPDATED': JSON.stringify(lastUpdatedTime()),
    },
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, 'src') },
    },
    server: {
      port: 5180,
    },
    test: {
      // Local tools may keep extra worktrees under `.claude/`: their copy of
      // the tests is not this checkout's
      exclude: [...configDefaults.exclude, '.claude/**'],
      // A thousand random values per property (`tests/setup.ts`)
      setupFiles: ['tests/setup.ts'],
      // The prelude imports fp-ts by path without an extension, which only a
      // bundler resolves
      server: {
        deps: {
          inline: ['@rinn7e/tea-cup-prelude', 'fp-ts'],
        },
      },
    },
  }
})
