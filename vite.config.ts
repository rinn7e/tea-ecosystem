import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import { configDefaults } from 'vitest/config'

// The day of the last commit of the repository (`YYYY-MM-DD`): the site is
// built on every push to `master`, so it is the day the site and its data
// last changed. Today when git cannot tell (no repository around).
const lastUpdatedDay = (): string => {
  try {
    return execSync('git log -1 --format=%cs', { encoding: 'utf8' }).trim()
  } catch {
    return new Date().toISOString().slice(0, 10)
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
      'import.meta.env.VITE_LAST_UPDATED': JSON.stringify(lastUpdatedDay()),
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
