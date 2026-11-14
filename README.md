<p align="center">
  <img src="public/favicon.svg" alt="TEA Ecosystem logo" width="128" height="128">
</p>

<h1 align="center">TEA Ecosystem</h1>

<p align="center">
  Every language and framework that implements The Elm Architecture, graded against Elm.
</p>

<p align="center">
  <a href="https://github.com/rinn7e/tea-ecosystem/actions/workflows/pages.yml"><img src="https://github.com/rinn7e/tea-ecosystem/actions/workflows/pages.yml/badge.svg" alt="Pages deploy"></a>
  <a href="https://rinn7e.com/tea-ecosystem/"><img src="https://img.shields.io/badge/open%20the%20site-rinn7e.com-0b7bbe" alt="Open the site"></a>
  <a href="https://github.com/vankeisb/react-tea-cup"><img src="https://img.shields.io/badge/built%20with-react--tea--cup-0b7bbe" alt="Built with react-tea-cup"></a>
  <a href="https://github.com/sponsors/rinn7e"><img src="https://img.shields.io/github/sponsors/rinn7e?label=sponsors&logo=githubsponsors&color=db2777" alt="GitHub Sponsors"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/rinn7e/tea-ecosystem" alt="License: MIT"></a>
</p>

A catalog of The Elm Architecture across languages: every language and framework that implements Model, Msg, update, Cmd and Sub, graded against Elm, so you can compare what each ecosystem has and what could come back to Elm.

**Open the site: [rinn7e.com/tea-ecosystem](https://rinn7e.com/tea-ecosystem/)**

<p align="center">
  <img src="doc/screenshot.png" alt="The catalog of TEA Ecosystem in a browser: the title, the language and framework boxes, the language logos, the search and the first row of framework cards">
</p>

The site has:

- **Catalog**: 90 entries in 27 languages, as cards or as a table of grades, filtered by tier, target, status and search, and sorted by popularity, by dates or by the day an entry was added. A filter that also matches archived entries, or entries of the TEA-adjacent list, says so and links to them.
- **A page per framework**: its grade on each part of TEA, with notes, and the other entries in its languages from both lists.
- **Rubric**: what counts as TEA, the four grades and the three tiers.
- **TEA-adjacent**: libraries that share the vocabulary but miss a hard requirement (Redux, NgRx, re-frame, ...), graded the same way and shown with the same listing as the catalog, filtered by what they lack.
- **Build your own TEA**: a runtime in eight steps, in Swift, TypeScript and Kotlin.

The thinking behind it is in [doc/analysis.md](doc/analysis.md).

## Stack

React with [react-tea-cup](https://github.com/vankeisb/react-tea-cup) (The Elm Architecture for React), `tea-cup-fp`, `fp-ts`, `io-ts`, Vite, TypeScript, Tailwind CSS v4, and Vitest with fast-check for property tests. Frontend only: the data is bundled at build time, and the site is static on GitHub Pages.

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

Edit `data/frameworks.json` (or `data/adjacent.json` for a library that misses a hard requirement). Give it the day you add it as `discoveredAt` (`YYYY-MM-DD`; a new entry shows as "Recently added" for 30 days), its `repo` (the full URL of its public repository, on GitHub, GitLab, Codeberg or another Gitea; only when its source is not public, its website instead, with the same URL in `website`), its `website` when it has one apart from the repository, its `source` when it is one package of a monorepo (the full URL of its directory in `repo`), and run `GITHUB_TOKEN=<token> node scripts/fetch-repo-stats.mjs` to fill its stars and its created and updated dates (after that, the stats of every entry refresh every week on their own: `.github/workflows/refresh-stats.yml` runs the same script, follows a repository that moved, commits the data when `pnpm run test` passes, and lists in its job summary what is left for a person: a status to check, a host that did not answer, a broken link, a link that redirects); a logo goes in `public/logo/` and is named in `logo`. Each grade is `native`, `managed`, `equivalent` or `missing`; the [rubric](doc/analysis.md#3-inclusion-rubric) says what each means (`equivalent` describes a part and never qualifies a tier). A superset names what it adds beyond TEA in a note that starts with `Superset: `; a TEA-adjacent library starts its notes with the requirements it misses (`Misses Cmd and Sub: ...`). `pnpm run test` checks that the file decodes and that every entry holds the rules of its tier.

## Deploy

`.github/workflows/pages.yml` checks, builds and publishes `dist/` to GitHub Pages on every push to `master`, and after every weekly refresh of the stats that commits new data (`refresh-stats.yml` starts it, since a push made with the `GITHUB_TOKEN` of a workflow starts no workflow). The site is served under `/tea-ecosystem/` (`.env.production`); the build copies `index.html` to `404.html` so a deep link opens the app. The built site counts visits with Cloudflare Web Analytics (no cookies, no personal data), added by the build only (`vite.config.ts`), so the dev server is never counted.

## Contributing

Corrections and new entries are welcome: see [CONTRIBUTING.md](CONTRIBUTING.md) for how to report one and how to pick up an issue.

## License

MIT
