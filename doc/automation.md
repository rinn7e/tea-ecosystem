# What runs on its own

The weekly refresh of stars and dates: [the data](data.md#stars-and-dates).

## New entries every week

Every Monday, `.github/workflows/discover.yml` runs an AI agent (`scripts/discover-agent.mjs`, on the Claude Agent SDK) that looks for TEA frameworks the catalog does not list yet, as `.github/discover-prompt.md` says.

1. It grades each candidate from its own docs and source.
2. It opens one draft pull request for the week, with three candidates at most and the evidence of each grade.
3. Only the data the agent wrote reaches the repository: the workflow checks it and makes a commit of its own of it.
4. The pull request merges on its own when every candidate passes `scripts/judge-discovered.sh`. Otherwise it stays a draft, with a comment that names the rules that failed, for a person to review and merge.

The rules of `scripts/judge-discovered.sh`:

- at least 6 stars (a project with 5 or fewer needs a person, who checks that it brings something new: the [small projects](analysis.md#3-inclusion-rubric) of the rubric);
- pushed to in the last year, and not archived;
- every grade verified;
- an example of at most 90 lines, with its source.

It skips what either data file lists, forks, archived, unmaintained, abandoned (no push for two years) and tiny projects, small projects (5 stars or fewer) that bring nothing new, and the projects of `data/rejected.json`. While its pull request is open, the next runs skip their search and spend nothing, so two pull requests never conflict.

### Settle a pull request by hand

For a pull request opened before these rules, or one a person edited, start the workflow "Settle discovered" (`.github/workflows/settle-discovered.yml`) with its number. It runs the same checks and rules, then merges it or comments.

### See what the agent did

Open the run in the Actions tab (workflow "Discover"):

| Where                                    | What                                                                                                                                                      |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The log of the agent step                | One line per step, live: each search, fetch, edit and command, each call denied or failed, each retry of the API, and a short line for each thing it says |
| The summary of the run                   | The report of the agent, or, when it did not finish, why and what it said last                                                                            |
| The artifact `discover-transcript-<try>` | The full transcript (every message, call and result), one per try, kept 7 days, also when the agent failed or timed out                                   |
| The artifact `discover-bundle`           | The branch of the agent, with its commits as they are, kept a day                                                                                         |

Secrets stay out of all of them:

- Any signed-in GitHub user can download the artifacts of a public repository, so the API key and the tokens are written as `***`.
- The rules of the agent deny a commit message read from a file or a template.
- Before each upload, `scripts/check-secrets.mjs` searches the transcript and every commit and file of the branch for the key and the token. A file that holds one is not uploaded, and the step fails with an error that names the secret; for the branch, the run then proposes nothing.

### Turn a candidate down

- **One candidate:** remove its entry and its example from the pull request, and add its repository to `data/rejected.json` in the same pull request. Then run `pnpm run test` on the branch before merging (no check runs on a pull request).
- **All of them:** close the pull request, and add each one to `data/rejected.json` on `master`.

Each rejection gives the day and the reason, so the project is never proposed again:

```json
{
  "repo": "https://github.com/<owner>/<name>",
  "rejectedAt": "2026-11-16",
  "reason": "A fork of an entry, with no change to its loop."
}
```

`pnpm run test` checks the file, and that no project is both listed and turned down.

### Setup

- The repository secret `ANTHROPIC_API_KEY`.
- GitHub Actions allowed to create pull requests (Settings, Actions, General).

## Deploy

- `.github/workflows/pages.yml` checks, builds and publishes `dist/` to GitHub Pages on every push to `master`, and after every weekly refresh of the stats that commits new data (`refresh-stats.yml` starts it, since a push made with the `GITHUB_TOKEN` of a workflow starts no workflow).
- The site is served at `https://tea.rinn7e.com/`, the custom domain of the repository in the Pages settings, from the root (`VITE_BASE_URL` in `.env.production`).
- GitHub Pages redirects the old links under `rinn7e.com/tea-ecosystem/` and `rinn7e.github.io/tea-ecosystem/` to it.
- The build renders every page to its own HTML file (`/framework/elm` is `framework/elm.html`), with its own title, description and link preview, draws the share card of each page (`og/<id>.png` for an entry, `og/page/<page>.png` for the others, `src/share-card.tsx`), reads the star count of the repository with the token of the workflow and writes it into every page, and writes `sitemap.xml` with every page (`scripts/prerender.mjs`). The browser shows that HTML at once and the script hydrates it. `404.html` is the empty page, for an address no page has.
- The built site counts visits with Cloudflare Web Analytics (no cookies, no personal data). Only the build adds it (`vite.config.ts`), so the dev server is never counted.
