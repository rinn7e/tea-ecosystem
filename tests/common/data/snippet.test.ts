import * as O from 'fp-ts/Option'
import { describe, expect, it } from 'vitest'

import { adjacentEntries, frameworks } from '@/common/data/catalog'
import {
  isKnownSnippetExtension,
  snippetFileNames,
  snippetOf,
} from '@/common/data/snippet'

const entries = [...frameworks, ...adjacentEntries]

describe('snippets', () => {
  it('name each file after an entry, with an extension it can highlight', () => {
    const ids = entries.map((e) => e.id)
    const wrong = snippetFileNames.filter(
      (fileName) =>
        !isKnownSnippetExtension(fileName) ||
        !ids.includes(fileName.slice(0, fileName.lastIndexOf('.'))),
    )
    expect(wrong).toEqual([])
  })

  it('give every example its source, and every source its example', () => {
    const wrong = entries.filter(
      (e) => O.isSome(snippetOf(e.id)) !== (e.snippetSource !== undefined),
    )
    expect(wrong.map((e) => e.id)).toEqual([])
  })

  it('hold only code, with no fence or rule of the Markdown they were copied from', () => {
    const isMarkdown = (line: string) => /^(```|---\s*$)/.test(line)
    const wrong = entries.filter((e) =>
      O.exists((s: { code: string }) => s.code.split('\n').some(isMarkdown))(
        snippetOf(e.id),
      ),
    )
    expect(wrong.map((e) => e.id)).toEqual([])
  })

  it('highlight the code', () => {
    const elm = snippetOf('elm')
    expect(O.isSome(elm)).toBe(true)
    expect(
      O.exists((s: { html: string }) => s.html.includes('hljs-'))(elm),
    ).toBe(true)
  })
})
