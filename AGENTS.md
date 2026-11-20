# Notes for AI coding agents

- Start with [README.md](README.md), then follow [doc/code-convention.md](doc/code-convention.md).
- The why of the project (the rubric, the decisions, the next phases) is in [doc/analysis.md](doc/analysis.md).
- Before adding a request to another host, an asset from a CDN, an embed, an analytics tool, or anything kept in the browser (cookies, storage), read [doc/code-convention.md#the-privacy-page](doc/code-convention.md#the-privacy-page): the privacy page must change in the same commit.
- Adding or changing a framework is an edit to `data/frameworks.json` or `data/adjacent.json`; `pnpm run test` checks it against the rubric.
