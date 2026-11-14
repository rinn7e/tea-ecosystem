import { spawnSync } from 'node:child_process'
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

// A git repository of its own for the tests of the scripts of the weekly
// search (`scripts/*-discovered.sh`), with stubs for `gh`, `pnpm` and the
// remote of `git`: a push goes to a bare repository beside it, which
// `git ls-remote` and `git fetch` then read, as GitHub would. The stubs
// answer from the environment of each run and write what they were asked
// to a log, so nothing reaches GitHub and the checks of this repository do
// not run inside its own tests.

export const scriptOf = (name: string): string =>
  path.resolve(import.meta.dirname, `../../scripts/${name}`)

const commandPath = (name: string): string =>
  spawnSync('sh', ['-c', `command -v ${name}`], {
    encoding: 'utf8',
  }).stdout.trim()

const realGit = commandPath('git')
const realJq = commandPath('jq')

// A bash of 4.4 or later, which the scripts need: the one of the macOS
// system is 3.2, so the one of Homebrew comes first when there is one
const isRecentBash = (bash: string): boolean =>
  spawnSync(bash, ['-c', 'shopt -s inherit_errexit'], { encoding: 'utf8' })
    .status === 0
const recentBash =
  ['/opt/homebrew/bin/bash', '/usr/local/bin/bash', commandPath('bash')].find(
    (bash) => bash !== '' && isRecentBash(bash),
  ) ?? 'bash'

export const json = (value: unknown): string =>
  `${JSON.stringify(value, null, 2)}\n`

// A pull request as `gh pr list --json` gives it
export type PullRequest = {
  number: number
  headRefName: string
  state: 'OPEN' | 'CLOSED' | 'MERGED'
  isCrossRepository: boolean
  title: string
  body: string
  url: string
}

export const pullRequestOf = (
  headRefName: string,
  more: Partial<PullRequest> = {},
): PullRequest => ({
  number: 1,
  headRefName,
  state: 'CLOSED',
  isCrossRepository: false,
  title: 'Add a framework',
  body: 'Repository: https://github.com/o/r',
  url: 'https://github.com/owner/name/pull/1',
  ...more,
})

// What the stubs answer in one run
export type Answers = {
  // Every pull request of the repository
  pullRequests?: PullRequest[]
  // Branches on GitHub with their commit, besides what was pushed
  onGitHub?: Record<string, string>
  // Make `gh pr list`, `gh pr create` or `git ls-remote` fail, as on an
  // error of the API
  failPullRequests?: boolean
  failCreate?: boolean
  failLsRemote?: boolean
  // Make `jq` crash on the call whose program holds this text
  crashJqOn?: string
}

export type ScriptRepo = {
  dir: string
  git: (...args: string[]) => string
  // `git` in the bare repository that stands for GitHub
  remoteGit: (...args: string[]) => string
  run: (
    script: string,
    args: string[],
    env: Record<string, string>,
    answers?: Answers,
  ) => { status: number | null; out: string; err: string; log: string }
  remove: () => void
}

const stub = (bin: string, name: string, body: string): void => {
  writeFileSync(path.join(bin, name), `#!/usr/bin/env bash\n${body}\n`)
  chmodSync(path.join(bin, name), 0o755)
}

// The inputs of the scripts, which each test sets itself: one inherited
// from the job that runs the tests (the workflow sets `BRANCH` and `DAY`
// on the steps that run `pnpm run test`) would change what a test checks
const scriptInputs = ['BASE', 'BRANCH', 'DAY', 'MAX_CANDIDATES']

const baseEnv = {
  ...Object.fromEntries(
    Object.entries(process.env).filter(
      ([name]) => !scriptInputs.includes(name),
    ),
  ),
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.invalid',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.invalid',
}

const gitIn =
  (cwd: string) =>
  (...args: string[]): string => {
    const result = spawnSync(realGit, args, {
      cwd,
      env: baseEnv,
      encoding: 'utf8',
    })
    if (result.status !== 0) {
      throw new Error(`git ${args.join(' ')}: ${result.stderr}`)
    } else {
      return result.stdout
    }
  }

// A repository whose base commit (the tag `base`) holds `frameworks` and
// `adjacent`, and `files` besides
export const scriptRepo = (
  frameworks: unknown[],
  adjacent: unknown[],
  files: Record<string, string> = {},
): ScriptRepo => {
  const root = mkdtempSync(path.join(tmpdir(), 'discover-script-'))
  const dir = path.join(root, 'repo')
  const remote = path.join(root, 'remote.git')
  const bin = path.join(root, 'bin')
  const answersDir = path.join(root, 'answers')
  const log = path.join(root, 'log')
  ;[dir, bin, answersDir, path.join(dir, 'data/snippet')].forEach((d) =>
    mkdirSync(d, { recursive: true }),
  )
  gitIn(root)('init', '-q', '--bare', remote)
  stub(
    bin,
    'git',
    [
      // A command that names the URL of GitHub runs on the bare
      // repository instead, its token masked in the log
      'args=()',
      'for a in "$@"; do',
      '  if [[ "$a" == https://x-access-token:* ]]; then args+=("$REMOTE"); else args+=("$a"); fi',
      'done',
      'case "$1" in',
      '  push|fetch)',
      '    echo "$1 ${*//$GH_TOKEN/<token>}" >> "$LOG"',
      `    exec ${realGit} "\${args[@]}" ;;`,
      '  ls-remote)',
      '    [ -z "$FAIL_LS_REMOTE" ] || { echo "fatal: HTTP 502" >&2; exit 128; }',
      '    echo "$1 ${*//$GH_TOKEN/<token>}" >> "$LOG"',
      '    ref="${@: -1}"',
      '    grep -F -e "$(printf \'\\t\')$ref" "$ON_GITHUB" || true',
      `    exec ${realGit} "\${args[@]}" ;;`,
      `  *) exec ${realGit} "$@" ;;`,
      'esac',
    ].join('\n'),
  )
  // `gh pr list` as the real one: the open pull requests unless `--state`
  // says otherwise, with only the fields of `--json`
  stub(
    bin,
    'gh',
    [
      'if [ "$1 $2" = "pr list" ]; then',
      '  [ -z "$FAIL_PR_LIST" ] || { echo "HTTP 502" >&2; exit 1; }',
      '  state=open; fields=""; previous=""',
      '  for a in "$@"; do',
      '    [ "$previous" != --state ] || state="$a"',
      '    [ "$previous" != --json ] || fields="$a"',
      '    previous="$a"',
      '  done',
      `  ${realJq} --arg state "$state" --arg fields "$fields" \\`,
      `    '($fields | split(",")) as $f | [.[] | select($state == "all" or (.state | ascii_downcase) == $state) | with_entries(select(.key as $k | any($f[]; . == $k)))]' \\`,
      '    "$PULL_REQUESTS"',
      'elif [ "$1 $2" = "pr create" ]; then',
      '  echo "pr create $*" >> "$LOG"',
      '  echo "body:" >> "$LOG"; cat >> "$LOG"',
      '  [ -z "$FAIL_CREATE" ] || { echo "GraphQL: Actions may not create pull requests" >&2; exit 1; }',
      '  echo "https://github.com/owner/name/pull/17"',
      'elif [ "$1 $2" = "pr comment" ]; then',
      '  echo "pr comment $*" >> "$LOG"',
      '  echo "comment:" >> "$LOG"; cat >> "$LOG"',
      'else',
      '  echo "gh $*" >> "$LOG"',
      'fi',
    ].join('\n'),
  )
  // The checks of the repository: the tests fail on an entry named
  // `failing`, the format on one named `unformatted`; both write whether
  // they saw the token, and print a line that looks like a workflow command
  stub(
    bin,
    'pnpm',
    [
      'echo "pnpm $* token=${GH_TOKEN-unset}" >> "$LOG"',
      'echo "::warning::from the checks"',
      'if [ "$2" = test ]; then ! grep -q \'"failing"\' data/frameworks.json',
      'elif [ "$2" = format:check ]; then ! grep -q \'"unformatted"\' data/frameworks.json',
      'fi',
    ].join('\n'),
  )
  writeFileSync(path.join(dir, 'data/frameworks.json'), json(frameworks))
  writeFileSync(path.join(dir, 'data/adjacent.json'), json(adjacent))
  Object.entries(files).forEach(([file, content]) => {
    mkdirSync(path.dirname(path.join(dir, file)), { recursive: true })
    writeFileSync(path.join(dir, file), content)
  })
  const git = gitIn(dir)
  git('init', '-q', '-b', 'master')
  git('add', '-A')
  git('commit', '-q', '-m', 'Base')
  git('tag', 'base')
  const run: ScriptRepo['run'] = (script, args, env, answers = {}) => {
    const pullRequests = path.join(answersDir, 'pull-requests.json')
    const onGitHub = path.join(answersDir, 'on-github')
    writeFileSync(pullRequests, json(answers.pullRequests ?? []))
    writeFileSync(
      onGitHub,
      Object.entries(answers.onGitHub ?? {})
        .map(([branch, commit]) => `${commit}\trefs/heads/${branch}\n`)
        .join(''),
    )
    writeFileSync(log, '')
    if (answers.crashJqOn === undefined) {
      rmSync(path.join(bin, 'jq'), { force: true })
    } else {
      stub(
        bin,
        'jq',
        [
          `for a in "$@"; do [[ "$a" != *${JSON.stringify(answers.crashJqOn)}* ]] || exit 3; done`,
          `exec ${realJq} "$@"`,
        ].join('\n'),
      )
    }
    const result = spawnSync(recentBash, [scriptOf(script), ...args], {
      cwd: dir,
      env: {
        ...baseEnv,
        PATH: `${bin}:${path.dirname(recentBash)}:${process.env.PATH ?? ''}`,
        GH_TOKEN: 'secret-token',
        GITHUB_REPOSITORY: 'owner/name',
        RUNNER_TEMP: answersDir,
        LOG: log,
        REMOTE: remote,
        PULL_REQUESTS: pullRequests,
        ON_GITHUB: onGitHub,
        FAIL_PR_LIST: answers.failPullRequests === true ? '1' : '',
        FAIL_CREATE: answers.failCreate === true ? '1' : '',
        FAIL_LS_REMOTE: answers.failLsRemote === true ? '1' : '',
        ...env,
      },
      encoding: 'utf8',
    })
    return {
      status: result.status,
      out: result.stdout,
      err: result.stderr,
      log: readFileSync(log, 'utf8'),
    }
  }
  return {
    dir,
    git,
    remoteGit: gitIn(remote),
    run,
    remove: () => rmSync(root, { recursive: true, force: true }),
  }
}
