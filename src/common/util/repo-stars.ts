import { cmdFromPromise } from '@rinn7e/tea-cup-prelude'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'
import * as t from 'io-ts'
import { PathReporter } from 'io-ts/PathReporter'
import { type Cmd, type Result } from 'tea-cup-fp'

// The repository of this site, which the bar links to
export const REPO_URL = 'https://github.com/rinn7e/tea-ecosystem'

const REPO_API = 'https://api.github.com/repos/rinn7e/tea-ecosystem'

const RepoJson = t.type({ stargazers_count: t.number })

// The star count in the answer of the GitHub API about a repository
export const starsOfJson = (json: unknown): E.Either<string, number> =>
  pipe(
    RepoJson.decode(json),
    E.bimap(
      (errors) => PathReporter.report(E.left(errors)).join('; '),
      (repo) => repo.stargazers_count,
    ),
  )

// The count a browser keeps, and when it read it, so it asks GitHub at
// most once an hour (`STARS_CACHE_MS`)
const STARS_CACHE_KEY = 'tea-ecosystem/repo-stars'
export const STARS_CACHE_MS = 3_600_000

const StarsCacheJson = t.type({ stars: t.number, at: t.number })

export const starsCacheTextOf = (stars: number, now: number): string =>
  JSON.stringify({ stars, at: now })

// The count kept in `text`, while it is less than an hour old at `now`
export const cachedStarsOf = (
  text: string | null,
  now: number,
): O.Option<number> =>
  pipe(
    O.fromNullable(text),
    O.chain((kept) => O.tryCatch((): unknown => JSON.parse(kept))),
    O.chain((json) => O.fromEither(StarsCacheJson.decode(json))),
    O.filter((kept) => now - kept.at >= 0 && now - kept.at < STARS_CACHE_MS),
    O.map((kept) => kept.stars),
  )

// Storage may be off (a private window, blocked site data): then every
// visit asks
const readStarsCache = (): string | null =>
  pipe(
    O.tryCatch(() => window.localStorage.getItem(STARS_CACHE_KEY)),
    O.toNullable,
  )

const writeStarsCache = (stars: number): number =>
  pipe(
    O.tryCatch(() =>
      window.localStorage.setItem(
        STARS_CACHE_KEY,
        starsCacheTextOf(stars, Date.now()),
      ),
    ),
    () => stars,
  )

const fetchRepoStars = (): Promise<number> =>
  fetch(REPO_API, { headers: { Accept: 'application/vnd.github+json' } })
    .then((response) =>
      response.ok
        ? response.json()
        : Promise.reject(new Error(`GitHub answered ${response.status}`)),
    )
    .then((json: unknown) =>
      pipe(
        starsOfJson(json),
        E.fold(
          (reason) => Promise.reject(new Error(reason)),
          (stars) => Promise.resolve(writeStarsCache(stars)),
        ),
      ),
    )

// The star count of the repository, read live from the browser of the
// visitor: no token and no cookies (a request to another origin sends
// none). The API allows 60 requests an hour per address without a token,
// and every device behind one router shares it, so the count is kept an
// hour in the browser, and the page shows the count of the build until
// then. A refused or slow request is a state of its own, not an error to
// show.
export const repoStarsCmd = <Msg>(
  toMsg: (result: Result<Error, number>) => Msg,
): Cmd<Msg> =>
  cmdFromPromise(
    () =>
      pipe(
        cachedStarsOf(readStarsCache(), Date.now()),
        O.match(fetchRepoStars, (stars) => Promise.resolve(stars)),
      ),
    toMsg,
  )
