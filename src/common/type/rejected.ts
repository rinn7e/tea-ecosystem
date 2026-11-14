import * as t from 'io-ts'

// A project a person turned down for the catalog, an entry of
// `data/rejected.json`: the weekly search (`.github/discover-prompt.md`)
// never proposes it again, and a reader of the file sees why it is not
// listed
export type Rejection = {
  // Its repository, as a full URL of owner and name, as the `repo` of an
  // entry (test "give every rejected repository as a full URL of owner and
  // name")
  repo: string
  // The day it was turned down (`YYYY-MM-DD`) (test "give every rejection
  // its day and a reason in plain ASCII")
  rejectedAt: string
  // Why, in a sentence of plain ASCII: a fork of an entry, abandoned, an
  // app and not a library, not TEA (test "give every rejection its day and
  // a reason in plain ASCII")
  reason: string
}

export const RejectionJson: t.Type<Rejection> = t.type({
  repo: t.string,
  rejectedAt: t.string,
  reason: t.string,
})
