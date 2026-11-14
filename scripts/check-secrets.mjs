// The secrets of the weekly search (`.github/workflows/discover.yml`), and
// the check that keeps them out of its artifacts. The agent can read its
// own environment, the API key included, and any signed-in GitHub user can
// download the artifacts of a public repository, which GitHub never masks
// (it masks only the log). `scripts/discover-agent.mjs` writes the values
// of `SECRET_NAMES` as `***` in its log and its transcript; this check runs
// before each upload of the search job, on the transcript and on the branch
// of the run (`scripts/bundle-discovered.sh`), and fails the step when what
// it reads still holds one of them, as fixed bytes, so the file is not
// uploaded. A secret written in another form (encoded, split up) gets
// through: that risk is accepted, as the job holds nothing that can write
// and the owner caps the spend of the key.
//
// The step names the key and the token of the job in its environment
// (`REQUIRED_NAMES`), even empty: a step that leaves one out fails, so a
// change to the workflow never turns the check into one that checks
// nothing.
//
// Run: ANTHROPIC_API_KEY=<key> GH_TOKEN=<token> \
//   node scripts/check-secrets.mjs <what> < <file>
import { readFileSync, realpathSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

export const SECRET_NAMES = ['ANTHROPIC_API_KEY', 'GH_TOKEN', 'GITHUB_TOKEN']

/** The secrets that the search job holds, which each step of a check sets */
export const REQUIRED_NAMES = ['ANTHROPIC_API_KEY', 'GH_TOKEN']

/**
 * The value of the secret `name` in `env`, or nothing: a value under 8
 * characters is no real key, and hiding it would garble the text.
 * @type {(env: Record<string, string | undefined>) => (name: string) => string[]}
 */
const secretOf = (env) => (name) => {
  const value = env[name] ?? ''
  return value.length >= 8 ? [value] : []
}

/**
 * The secrets of `env` that the log and the transcript hide.
 * @type {(env: Record<string, string | undefined>) => string[]}
 */
export const secretsOf = (env) => SECRET_NAMES.flatMap(secretOf(env))

/**
 * The names of the secrets of `env` whose value is somewhere in `data`.
 * @type {(env: Record<string, string | undefined>) => (data: string | Buffer) => string[]}
 */
export const secretNamesIn = (env) => (data) =>
  SECRET_NAMES.filter((name) =>
    secretOf(env)(name).some((value) => data.includes(value)),
  )

/**
 * The errors of a check of `data`, one per secret found and one for the
 * names of `REQUIRED_NAMES` that `env` does not set; none when it is clean.
 * Only the name of a secret is printed, never its value.
 * @type {(env: Record<string, string | undefined>) => (what: string, data: string | Buffer) => string[]}
 */
export const errorsOf = (env) => (what, data) => {
  const unset = REQUIRED_NAMES.filter((name) => env[name] === undefined)
  return [
    ...(unset.length === 0
      ? []
      : [
          `::error::${what} is not checked for secrets: the step does not set ${unset.join(' and ')}, so it stays out of the artifacts`,
        ]),
    ...secretNamesIn(env)(data).map(
      (name) =>
        `::error::${what} holds the value of ${name}, so it stays out of the artifacts`,
    ),
  ]
}

// The real path on both sides, as in `scripts/discover-agent.mjs`
if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
) {
  const errors = errorsOf(process.env)(
    process.argv[2] ?? 'The input',
    readFileSync(0),
  )
  errors.forEach((error) => console.log(error))
  process.exitCode = errors.length === 0 ? 0 : 1
}
