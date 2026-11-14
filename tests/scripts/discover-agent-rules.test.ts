import { spawn, spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { type Call, messagesApi, toolUseIdOf } from '../helper/messages-api'
import { scriptOf } from '../helper/script-repo'

// `scripts/discover-agent.mjs` with the Claude Code that the Agent SDK
// bundles, against a stand-in for the Messages API (no key, no cost): the
// agent makes each call below, and the permission rules of the script
// allow or deny it for real. The rules are matched by Claude Code, not by
// the script, so only a run shows what they let through: each rule of
// `ALLOWED_TOOLS` has a call it allows, and each rule that ends in `*` has
// calls that chain, redirect or substitute a command after it, which must
// be denied. A new version of the SDK that matches them another way fails
// here. Found on the first run (14 Nov 2026): a `Write(...)` rule never
// matches, the Write tool follows the `Edit(...)` rules; and Claude Code
// allows the options of a read-only command such as `git log` on its own,
// but not `--output` or a redirect to a file.

type Case = { call: Call; allowed: boolean; writes?: string }

// Made in `beforeAll` and removed in `afterAll`, so a skipped suite leaves
// nothing behind
const root = path.join(realpathSync(tmpdir()), `discover-agent-${randomUUID()}`)
const repo = path.join(root, 'repo')
const inRepo = (file: string): string => path.join(repo, file)
const outside = (file: string): string => path.join(root, file)
const key = 'sk-ant-test-not-a-key'

const write = (file: string): Call => ({
  name: 'Write',
  input: { file_path: file, content: 'x\n' },
})
const read = (file: string): Call => ({
  name: 'Read',
  input: { file_path: inRepo(file) },
})
const edit = (file: string, from: string, to: string): Call => ({
  name: 'Edit',
  input: { file_path: inRepo(file), old_string: from, new_string: to },
})
const bash = (command: string): Call => ({ name: 'Bash', input: { command } })
const allowed = (call: Call, writes?: string): Case => ({
  call,
  allowed: true,
  writes,
})
const denied = (call: Call, writes?: string): Case => ({
  call,
  allowed: false,
  writes,
})
// A file that a denied call must not leave in `tests/`, where
// `pnpm run test` would run it
const planted = (name: string): string => inRepo(`tests/${name}.test.ts`)

const cases: Case[] = [
  // Each rule of `ALLOWED_TOOLS`, in the order of a run
  allowed(bash('git restore data/frameworks.json data/adjacent.json')),
  allowed(bash('git clean -fdq data/snippet/')),
  allowed(bash('git switch -c discover/2026-11-14')),
  allowed(read('data/frameworks.json')),
  allowed(edit('data/frameworks.json', '[]', '[ ]')),
  allowed(read('data/adjacent.json')),
  allowed(edit('data/adjacent.json', '[]', '[ ]')),
  allowed(write(inRepo('data/snippet/new.rs')), inRepo('data/snippet/new.rs')),
  allowed(
    write(inRepo('data/snippet/sub/new.rs')),
    inRepo('data/snippet/sub/new.rs'),
  ),
  allowed(bash('pnpm run format')),
  allowed(bash('pnpm run test')),
  allowed(bash('git add data/frameworks.json data/adjacent.json')),
  allowed(bash("git commit -q -m 'Add x'")),
  allowed(bash('git branch --show-current')),
  allowed(bash('git status')),
  allowed(bash('git diff')),
  allowed(bash('git log')),
  allowed(bash('gh repo view owner/name --json stargazerCount')),
  allowed(bash('gh search repos "elm architecture" --sort updated')),
  // What Claude Code allows on its own: a read-only command with options,
  // and one whose output shows the key, which the log and the transcript
  // must hide
  allowed(bash('git log --oneline -n 1')),
  allowed(bash('git status > /dev/null')),
  allowed(bash(`echo ${key}`)),
  // Files outside the data of an entry
  denied(write(inRepo('data/outside.rs')), inRepo('data/outside.rs')),
  denied(write(planted('written')), planted('written')),
  denied(
    write(inRepo('data/snippet/../../tests/climbed.test.ts')),
    planted('climbed'),
  ),
  denied(write(outside('home/.bashrc')), outside('home/.bashrc')),
  allowed(read('src/main.ts')),
  denied(edit('src/main.ts', 'main', 'evil')),
  // A write through the options or the output of a command
  denied(bash(`git log --output=${outside('log.txt')}`), outside('log.txt')),
  denied(bash(`git diff --output=${outside('diff.txt')}`), outside('diff.txt')),
  denied(bash(`git status > ${outside('status.txt')}`), outside('status.txt')),
  denied(bash(`echo x > ${planted('echoed')}`), planted('echoed')),
  // A command chained, redirected or substituted after a rule that ends
  // in `*`, as a name taken from a page could carry
  denied(bash(`git add -A > ${planted('added')}`), planted('added')),
  denied(
    bash(`git commit -q -m x; touch ${planted('chained')}`),
    planted('chained'),
  ),
  denied(
    bash(`git commit --allow-empty -m "$(touch ${planted('substituted')})"`),
    planted('substituted'),
  ),
  denied(
    bash(`git branch x && touch ${planted('branched')}`),
    planted('branched'),
  ),
  denied(
    bash(`git switch -c y $(touch ${planted('switched')})`),
    planted('switched'),
  ),
  denied(bash(`gh repo view x/y > ${planted('viewed')}`), planted('viewed')),
  denied(
    bash(`gh search repos x && touch ${planted('searched')}`),
    planted('searched'),
  ),
  // Commands no rule names
  denied(bash('git push origin master')),
  denied(bash('git config core.hooksPath data')),
  denied(bash('curl -s http://127.0.0.1:1')),
  denied(bash('gh api user')),
]

// The ids of the calls the run denied: the `permission_denials` of its
// result, the record that Claude Code keeps of every denial
const deniedIdsOf = (messages: unknown): string[] =>
  (Array.isArray(messages) ? messages : []).flatMap((message: unknown) =>
    typeof message === 'object' &&
    message !== null &&
    'permission_denials' in message &&
    Array.isArray(message.permission_denials)
      ? message.permission_denials.flatMap((denial: unknown) =>
          typeof denial === 'object' &&
          denial !== null &&
          'tool_use_id' in denial &&
          typeof denial.tool_use_id === 'string'
            ? [denial.tool_use_id]
            : [],
        )
      : [],
  )

// Whether each call that came back failed, by its id: a call that never
// ran has no result at all
const failedByIdOf = (messages: unknown): Map<string, boolean> =>
  new Map(
    (Array.isArray(messages) ? messages : []).flatMap((message: unknown) =>
      typeof message === 'object' &&
      message !== null &&
      'type' in message &&
      message.type === 'user' &&
      'message' in message &&
      typeof message.message === 'object' &&
      message.message !== null &&
      'content' in message.message &&
      Array.isArray(message.message.content)
        ? message.message.content.flatMap((block: unknown) =>
            typeof block === 'object' &&
            block !== null &&
            'tool_use_id' in block &&
            typeof block.tool_use_id === 'string'
              ? [
                  [
                    block.tool_use_id,
                    'is_error' in block && block.is_error === true,
                  ] satisfies [string, boolean],
                ]
              : [],
          )
        : [],
    ),
  )

// Through a link, as a checkout under `/tmp` on macOS is: the script must
// still run
const link = outside('discover-agent.mjs')

// Its exit code and what it printed; a run that hangs is stopped before
// the timeout of the suite
const runAgent = (
  env: Record<string, string>,
): Promise<{ status: number | null; out: string }> =>
  new Promise((resolve) => {
    const chunks: Buffer[] = []
    const child = spawn(process.execPath, [link], {
      cwd: repo,
      env,
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 100_000,
    })
    child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk))
    child.on('close', (status) =>
      resolve({ status, out: Buffer.concat(chunks).toString() }),
    )
  })

const run: {
  status: number | null
  lines: string[]
  transcript: string
  denied: string[]
  failed: Map<string, boolean>
} = {
  status: null,
  lines: [],
  transcript: '',
  denied: [],
  failed: new Map(),
}

// `gh` is a stub, so a call of it reaches no GitHub
const gitEnv = {
  PATH: `${outside('bin')}:${process.env.PATH ?? '/usr/bin:/bin'}`,
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.invalid',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.invalid',
}

const git = (...args: string[]): void => {
  const done = spawnSync('git', args, { cwd: repo, env: gitEnv })
  if (done.status !== 0) {
    throw new Error(`git ${args.join(' ')}: ${String(done.stderr)}`)
  }
}

describe('the permission rules of the discovery agent, in Claude Code', () => {
  beforeAll(async () => {
    ;['data/snippet', 'src', 'tests', 'bin'].forEach((dir) =>
      mkdirSync(path.join(dir === 'bin' ? root : repo, dir), {
        recursive: true,
      }),
    )
    mkdirSync(outside('home'))
    writeFileSync(outside('bin/gh'), '#!/bin/sh\nexit 0\n', { mode: 0o755 })
    writeFileSync(inRepo('data/frameworks.json'), '[]\n')
    writeFileSync(inRepo('data/adjacent.json'), '[]\n')
    writeFileSync(inRepo('src/main.ts'), 'main\n')
    // The checks of the repository, as stubs: the rule is what is tested
    writeFileSync(
      inRepo('package.json'),
      JSON.stringify({ scripts: { format: 'true', test: 'true' } }),
    )
    // A repository with a commit, so each git call that is allowed works
    git('init', '-q', '-b', 'master')
    git('add', '-A')
    git('commit', '-q', '-m', 'Base')
    symlinkSync(scriptOf('discover-agent.mjs'), link)
    const api = await messagesApi(cases.map(({ call }) => call))
    const execution = outside('execution.json')
    const ran = await (async () => {
      try {
        return await runAgent({
          ...gitEnv,
          HOME: outside('home'),
          // Its own files of the run stay in this folder too
          CLAUDE_CODE_TMPDIR: outside('home'),
          ANTHROPIC_API_KEY: key,
          ANTHROPIC_BASE_URL: api.url,
          CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
          DAY: '2026-11-14',
          EXECUTION_FILE: execution,
        })
      } finally {
        await api.close()
      }
    })()
    run.status = ran.status
    run.lines = ran.out.trimEnd().split('\n')
    run.transcript = readFileSync(execution, 'utf8')
    const messages: unknown = JSON.parse(run.transcript)
    run.denied = deniedIdsOf(messages)
    run.failed = failedByIdOf(messages)
  }, 120_000)

  afterAll(() => rmSync(root, { recursive: true, force: true }))

  it('print the live log between the markers, with a line for each denial and no failure', () => {
    const marker = /^::stop-commands::(discover-agent-[0-9a-f-]{36})$/.exec(
      run.lines[0] ?? '',
    )?.[1]
    expect(marker).toBeDefined()
    expect(run.lines.at(-1)).toBe(`::${marker}::`)
    expect(run.lines[1]).toBe(
      'Start: claude-opus-5-5, dontAsk, tools Bash Edit Glob Grep Read WebFetch WebSearch Write',
    )
    expect(run.lines.filter((line) => line.startsWith('Denied:'))).toHaveLength(
      cases.filter((each) => !each.allowed).length,
    )
    expect(run.lines).toContain('Denied: Bash(git push origin master)')
    expect(run.lines.filter((line) => line.startsWith('Failed:'))).toEqual([])
  })

  it('hide the key in the log and in the transcript', () => {
    expect(run.lines).toContain('Tool: Bash echo ***')
    expect(run.lines.join('\n')).not.toContain(key)
    expect(run.transcript).not.toContain(key)
  })

  it('end the run as it went', () => {
    expect(run.status).toBe(0)
  })

  it('allow and deny each call as the rules say', () => {
    expect(
      cases.map(({ call }, step) => ({
        call,
        allowed: !run.denied.includes(toolUseIdOf(step)),
      })),
    ).toEqual(cases.map(({ call, allowed }) => ({ call, allowed })))
  })

  it('run each allowed call, and turn each denied one back', () => {
    expect(
      cases.map(({ call }, step) => ({
        call,
        failed: run.failed.get(toolUseIdOf(step)),
      })),
    ).toEqual(cases.map(({ call, allowed }) => ({ call, failed: !allowed })))
    expect(
      ['data/frameworks.json', 'data/adjacent.json'].map((file) =>
        readFileSync(inRepo(file), 'utf8'),
      ),
    ).toEqual(['[ ]\n', '[ ]\n'])
  })

  it('write a file only through a call that is allowed', () => {
    expect(
      cases.flatMap(({ writes }) =>
        writes === undefined ? [] : [{ writes, written: existsSync(writes) }],
      ),
    ).toEqual(
      cases.flatMap(({ allowed, writes }) =>
        writes === undefined ? [] : [{ writes, written: allowed }],
      ),
    )
  })
})
