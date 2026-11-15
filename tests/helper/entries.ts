import { entriesAt } from '@/common/data/catalog'

// The entries of both lists as the tests see them: derived at a moment
// before any push, so every entry with a push reads active, and only the
// entries stored as archived (Seed, ts-elmish and Comet) or with no public
// repository stand out. No test changes its result as the time or the data
// moves on. The status a last push tells is tested on entries made for it
// (`statusAt`), and at a late time through the app in
// `tests/update.test.ts`.
export const testEntries = entriesAt(0)

export const frameworks = testEntries.catalog

export const adjacentEntries = testEntries.adjacent
