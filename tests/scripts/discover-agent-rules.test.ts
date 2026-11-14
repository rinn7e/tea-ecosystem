import { spawn } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
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
// the script, so only a run shows what they let through; a new version of
// the SDK that matches them another way fails here. Found on the first
// run (14 Nov 2026): a `Write(...)` rule never matches, the Write tool
// follows the `Edit(...)` rules; and Claude Code allows the options of a
// read-only command such as `git log` on its own, but not `--output` or a
// redirect to a file.

type Case = { call: Call; allowed: boolean; writes?: string }

const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'discover-agent-')))
const repo = path.join(root, 'repo')
const inRepo = (file: string): string => path.join(repo, file)
const outside = (file: string): string => path.join(root, file)

const write = (file: string): Call => ({
  name: 'Write',
  input: { file_path: file, content: 'x\n' },
})
const bash = (command: string): Call => ({ name: 'Bash', input: { command } })

const cases: Case[] = [
  {
    call: write(inRepo('data/snippet/new.rs')),
    allowed: true,
    writes: inRepo('data/snippet/new.rs'),
  },
  {
    call: write(inRepo('data/snippet/sub/new.rs')),
    allowed: true,
    writes: inRepo('data/snippet/sub/new.rs'),
  },
  {
    call: write(inRepo('data/outside.rs')),
    allowed: false,
    writes: inRepo('data/outside.rs'),
  },
  {
    call: write(inRepo('tests/evil.test.ts')),
    allowed: false,
    writes: inRepo('tests/evil.test.ts'),
  },
  {
    call: write(outside('home/.bashrc')),
    allowed: false,
    writes: outside('home/.bashrc'),
  },
  {
    call: {
      name: 'Read',
      input: { file_path: inRepo('data/frameworks.json') },
    },
    allowed: true,
  },
  {
    call: {
      name: 'Edit',
      input: {
        file_path: inRepo('data/frameworks.json'),
        old_string: '[]',
        new_string: '[ ]',
      },
    },
    allowed: true,
  },
  {
    call: { name: 'Read', input: { file_path: inRepo('src/main.ts') } },
    allowed: true,
  },
  {
    call: {
      name: 'Edit',
      input: {
        file_path: inRepo('src/main.ts'),
        old_string: 'main',
        new_string: 'evil',
      },
    },
    allowed: false,
  },
  { call: bash('git status'), allowed: true },
  { call: bash('git log --oneline -n 1'), allowed: true },
  { call: bash('git status > /dev/null'), allowed: true },
  {
    call: bash(`git log --output=${outside('log.txt')}`),
    allowed: false,
    writes: outside('log.txt'),
  },
  {
    call: bash(`git diff --output=${outside('diff.txt')}`),
    allowed: false,
    writes: outside('diff.txt'),
  },
  {
    call: bash(`git status > ${outside('status.txt')}`),
    allowed: false,
    writes: outside('status.txt'),
  },
  {
    call: bash(`echo x > ${inRepo('tests/evil.test.ts')}`),
    allowed: false,
    writes: inRepo('tests/evil.test.ts'),
  },
  { call: bash('git push origin master'), allowed: false },
  { call: bash('git config core.hooksPath data'), allowed: false },
  { call: bash('curl -s http://127.0.0.1:1'), allowed: false },
  { call: bash('gh api user'), allowed: false },
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

const runAgent = (env: Record<string, string>): Promise<number | null> =>
  new Promise((resolve) =>
    spawn(process.execPath, [scriptOf('discover-agent.mjs')], {
      cwd: repo,
      env,
      stdio: 'ignore',
    }).on('close', resolve),
  )

const run: { status: number | null; denied: string[] } = {
  status: null,
  denied: [],
}

describe('the permission rules of the discovery agent, in Claude Code', () => {
  beforeAll(async () => {
    ;['data/snippet', 'src', 'tests', 'home'].forEach((dir) =>
      mkdirSync(path.join(dir === 'home' ? root : repo, dir), {
        recursive: true,
      }),
    )
    writeFileSync(inRepo('data/frameworks.json'), '[]\n')
    writeFileSync(inRepo('src/main.ts'), 'main\n')
    const api = await messagesApi(cases.map(({ call }) => call))
    const execution = outside('execution.json')
    run.status = await runAgent({
      PATH: process.env.PATH ?? '/usr/bin:/bin',
      HOME: outside('home'),
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_CONFIG_GLOBAL: '/dev/null',
      ANTHROPIC_API_KEY: 'sk-ant-test-not-a-key',
      ANTHROPIC_BASE_URL: api.url,
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
      DAY: '2026-11-14',
      EXECUTION_FILE: execution,
    })
    await api.close()
    run.denied = deniedIdsOf(JSON.parse(readFileSync(execution, 'utf8')))
  }, 120_000)

  afterAll(() => rmSync(root, { recursive: true, force: true }))

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
