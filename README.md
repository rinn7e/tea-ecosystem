# TEA Ecosystem

A catalog of The Elm Architecture across languages: every language and framework that implements Model, Msg, update, Cmd and Sub, graded against Elm, so you can compare what each ecosystem has and what could come back to Elm.

![The catalog of TEA Ecosystem in a browser: the title, the language and framework boxes, the language logos, the search and the first row of framework cards](doc/screenshot.png)

The site has:

- **Catalog**: 57 frameworks in 18 languages, as cards or as a table of grades, filtered by tier, target and search.
- **A page per framework**: its grade on each part of TEA, with notes.
- **Rubric**: what counts as TEA, the four grades and the three tiers.
- **TEA-adjacent**: libraries that share the vocabulary but miss a hard requirement (Redux, NgRx, re-frame, ...), graded the same way and shown with the same listing as the catalog, filtered by what they lack.
- **Build your own TEA**: a runtime in eight steps, in Swift, TypeScript and Kotlin.

The thinking behind it is in [doc/analysis.md](doc/analysis.md).

## Stack

React with [react-tea-cup](https://github.com/vankeisb/react-tea-cup) (The Elm Architecture for React), `tea-cup-fp`, `fp-ts`, `io-ts`, Vite, TypeScript, Tailwind CSS v4 and Vitest. Frontend only: the data is bundled at build time, and the site is static on GitHub Pages.

## Run it

The `@rinn7e` packages come from GitHub Packages, so `~/.npmrc` needs a token that can read packages:

```bash
//npm.pkg.github.com/:_authToken=<token>
```

Then:

```bash
pnpm install
```

```bash
pnpm dev
```

The site runs on `http://localhost:5180`.

## Check it

```bash
pnpm run check && pnpm run lint && pnpm run format:check && pnpm run test
```

```bash
pnpm run build
```

## Add or fix a framework

Edit `data/frameworks.json` (or `data/adjacent.json` for a library that misses a hard requirement). Give it its `repo` (the full URL of its public repository, on GitHub, GitLab, Codeberg or another Gitea) and run `GITHUB_TOKEN=<token> node scripts/fetch-repo-stats.mjs` to fill its stars and its created and updated dates; a logo goes in `public/logo/` and is named in `logo`. Each grade is `native`, `managed`, `equivalent` or `missing`; the [rubric](doc/analysis.md#3-inclusion-rubric) says what each means. `pnpm run test` checks that the file decodes and that every entry holds the rules of its tier.

## Deploy

`.github/workflows/pages.yml` checks, builds and publishes `dist/` to GitHub Pages on every push to `master`. The site is served under `/tea-ecosystem/` (`.env.production`); the build copies `index.html` to `404.html` so a deep link opens the app.

## License

MIT
