<p align="center">
  <img src="public/favicon.svg" alt="TEA Ecosystem logo" width="128" height="128">
</p>

<h1 align="center">TEA Ecosystem</h1>

<p align="center">
  <a href="https://tea.rinn7e.com/"><b>tea.rinn7e.com</b></a>
</p>

<p align="center">
  Every language and framework that implements The Elm Architecture, graded against Elm.
</p>

<p align="center">
  <a href="https://github.com/rinn7e/tea-ecosystem/actions/workflows/pages.yml"><img src="https://github.com/rinn7e/tea-ecosystem/actions/workflows/pages.yml/badge.svg" alt="Pages deploy"></a>
  <a href="https://tea.rinn7e.com/"><img src="https://img.shields.io/badge/open%20the%20site-tea.rinn7e.com-0b7bbe" alt="Open the site"></a>
  <a href="https://github.com/vankeisb/react-tea-cup"><img src="https://img.shields.io/badge/built%20with-react--tea--cup-0b7bbe" alt="Built with react-tea-cup"></a>
  <a href="https://github.com/sponsors/rinn7e"><img src="https://img.shields.io/github/sponsors/rinn7e?label=sponsors&logo=githubsponsors&color=db2777" alt="GitHub Sponsors"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/rinn7e/tea-ecosystem" alt="License: MIT"></a>
</p>

Every framework that does The Elm Architecture (Model, Msg, update, Cmd, Sub), in every language, graded against Elm.

<p align="center">
  <img src="doc/screenshot.png" alt="The catalog of TEA Ecosystem in a browser: the title, the language and framework boxes, the language logos, the search and the first row of framework cards">
</p>

## On the site

- **Catalog**: every entry, with search and filters.
- **A page per entry**: how it does each part of TEA.
- **Rubric**: what counts as TEA.
- **TEA-adjacent**: close, but missing a hard requirement (Redux, XState, ...).
- **Build your own TEA**: a runtime in eight steps.

Why it exists: [doc/analysis.md](doc/analysis.md).

## Run it

Some packages come from GitHub, so npm needs a GitHub token once:

1. Make a [classic token](https://github.com/settings/tokens/new?scopes=read:packages) with only `read:packages`.
2. Save it, with your token in place of `<token>`:

```bash
echo "//npm.pkg.github.com/:_authToken=<token>" >> ~/.npmrc
```

Then:

```bash
pnpm install
```

```bash
pnpm dev
```

Open `http://localhost:5180`.

## Check it

```bash
pnpm run check && pnpm run lint && pnpm run format:check && pnpm run test
```

## Add or fix an entry

Edit `data/frameworks.json` (or `data/adjacent.json`), then run `pnpm run test`. The fields: [doc/data.md](doc/data.md).

## Runs on its own

- Every week, stars and dates refresh, and an AI agent proposes new entries.
- Every push to `master` deploys to `https://tea.rinn7e.com/`.

How: [doc/automation.md](doc/automation.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
