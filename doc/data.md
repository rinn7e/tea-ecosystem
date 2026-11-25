# The data

Each entry lives in `data/frameworks.json`, or in `data/adjacent.json` for a library that misses a hard requirement of the rubric. `pnpm run test` checks that both files decode and that every entry holds the rules of its tier. The rules for each field are in `doc/code-convention.md`, section "Data files".

## Fields

| Field                | Required | What it holds                                                                                                                                                                                                                                                           |
| -------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `discoveredAt`       | yes      | When you add it, `YYYY-MM-DDTHH:MM:SSZ` in UTC. A new entry shows as "Recently added" for 30 days.                                                                                                                                                                      |
| `repo`               | yes      | The full URL of its public repository (GitHub, GitLab, Codeberg or another Gitea). Only when its source is not public: its website, with the same URL in `website`.                                                                                                     |
| `website`            | no       | Its website, when it has one apart from the repository                                                                                                                                                                                                                  |
| `source`             | no       | For one package of a monorepo: the full URL of its directory in `repo`                                                                                                                                                                                                  |
| `logo`               | no       | A file in `public/logo/`: an SVG, or a WebP of at most 144 px. Without one, the logo of its language stands in, on stripes.                                                                                                                                             |
| `logoOnLight`        | no       | `true` when the logo is drawn in dark ink on a transparent ground (its tile stays white in dark mode)                                                                                                                                                                   |
| `logoPadding`        | no       | `small`, `medium` or `large`, for a logo drawn edge to edge that looks too large next to the others                                                                                                                                                                     |
| `status`             | no       | Only `archived` (its repository is archived, or its author says it is no longer maintained). The site derives the rest from `updatedAt`: a push in the last year is active, in the last two quiet, else archived. An entry with no public repository stores its status. |
| `unmaintainedNotice` | no       | For an entry whose author says it is no longer maintained, though its repository is not archived: where the author says so (its status is then `archived`)                                                                                                              |

## Grades and notes

- Each grade is `native`, `managed`, `equivalent` or `missing`. The [rubric](doc/analysis.md#3-inclusion-rubric) says what each means; `equivalent` describes a part and never qualifies a tier.
- A superset names what it adds beyond TEA in a note that starts with `Superset: `.
- A TEA-adjacent library starts its notes with the requirements it misses (`Misses Cmd and Sub: ...`).
- An entry added from 2026-11-25 on with fewer than 5 stars names what it brings that the catalog does not have in a note that starts with `New: ` (the [small projects](analysis.md#3-inclusion-rubric) of the rubric).

## Stars and dates

Fill its stars, and the times its repository was created and last pushed to (in UTC, so two of one day sort newest first; the site shows only the month), with:

```bash
GITHUB_TOKEN=<token> node scripts/fetch-repo-stats.mjs
```

After that they refresh every week on their own: `.github/workflows/refresh-stats.yml` runs the same script, follows a repository that moved, and commits the data when `pnpm run test` passes. Its job summary lists what is left for a person: a status to check, a host that did not answer, a broken link, a link that redirects.
