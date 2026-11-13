// The path the site is served under: `/` in development, the project path
// on GitHub Pages (`.env.production`)
export const BASE_URL: string = import.meta.env.VITE_BASE_URL ?? '/'

// The day the repository was last changed (`YYYY-MM-DD`), read at build
// time from git (`vite.config.ts`)
export const LAST_UPDATED: string = import.meta.env.VITE_LAST_UPDATED ?? ''
