import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import path from 'node:path'
import { type Plugin, defineConfig, loadEnv } from 'vite'
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

// Cloudflare Web Analytics, in the built site only, so a visit to the dev
// server is never counted. No cookies and no personal data, so no consent
// banner. The token is public (it ships in every page), and `spa` counts
// each move of the app as a page view. The site is set to "Enable with JS
// Snippet installation" in the Web Analytics of `rinn7e.com`: the traffic
// goes straight to GitHub Pages, so Cloudflare cannot inject it.
const cloudflareWebAnalytics = (): Plugin => ({
  name: 'cloudflare-web-analytics',
  apply: 'build',
  transformIndexHtml: () => [
    {
      tag: 'script',
      attrs: {
        defer: true,
        src: 'https://static.cloudflareinsights.com/beacon.min.js',
        'data-cf-beacon': JSON.stringify({
          token: '4aa2721b854f435d8dbd10a769b10b78',
          spa: true,
        }),
      },
      injectTo: 'body',
    },
  ],
})

// A static site on GitHub Pages, served from the root of its hostname
// (`VITE_BASE_URL` in `.env.production`). `pnpm run build` runs Vite twice:
// once for the browser (`dist/`), and once with `--ssr` to compile the app
// for Node (`dist-ssr/`), which `scripts/prerender.mjs` runs to write the
// HTML of every page. So `isSsrBuild` is that build of the prerender: the
// site has no server. `404.html`, a copy of `index.html`, is the empty page
// for an address no page has.
export default defineConfig(({ mode, isSsrBuild }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: env.VITE_BASE_URL ?? '/',
    plugins: [react(), tailwindcss(), cloudflareWebAnalytics()],
    define: {
      'import.meta.env.VITE_LAST_UPDATED': JSON.stringify(lastUpdatedTime()),
    },
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, 'src') },
    },
    // The libraries go to scripts of their own in the build for the
    // browser: they change far less often than the data and the app, which
    // change every week, so a returning visitor keeps them in its cache
    // across deploys. React and its scheduler apart, as they are the
    // largest and change the least.
    build: isSsrBuild
      ? {}
      : {
          rolldownOptions: {
            output: {
              codeSplitting: {
                groups: [
                  {
                    name: 'react',
                    test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
                  },
                  { name: 'vendor', test: /node_modules/ },
                ],
              },
            },
          },
        },
    // The renderer of `scripts/prerender.mjs` bundles every package: some
    // import fp-ts by a path without an extension, which only a bundler
    // resolves
    ssr: {
      noExternal: true,
    },
    server: {
      port: 5180,
    },
    test: {
      // The tests live in `tests/` only: a file elsewhere that looks like a
      // test (a `.test.ts` dropped in `data/` by the weekly search, for
      // example) never runs
      include: ['tests/**/*.test.{ts,tsx}'],
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
