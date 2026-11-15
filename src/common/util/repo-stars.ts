import { cmdFromPromise } from '@rinn7e/tea-cup-prelude'
import * as E from 'fp-ts/Either'
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

// The star count of the repository, read live from the browser of the
// visitor: no token and no cookies (a request to another origin sends
// none). The API allows 60 requests an hour per address without a token,
// so a refused or slow request is a state of its own, not an error to show.
export const repoStarsCmd = <Msg>(
  toMsg: (result: Result<Error, number>) => Msg,
): Cmd<Msg> =>
  cmdFromPromise(
    () =>
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
              (stars) => Promise.resolve(stars),
            ),
          ),
        ),
    toMsg,
  )
