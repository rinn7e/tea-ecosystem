# TEA Ecosystem: project analysis

Date: 2026-11-13. Status: the first version of the site is built (section 11).

## 1. The idea

A website that lists every language or framework that implements The Elm Architecture (TEA), and the library ecosystem around each one, so that people can:

1. See which frameworks really implement TEA, and how faithfully.
2. Compare ecosystems capability by capability ("routing", "websockets", "TUI rendering", "effect testing", ...).
3. See what Elm has that others lack, and what others have that Elm lacks and might be worth bringing back to Elm.

A second page lists the "TEA-adjacent" libraries (Redux and friends) that do not qualify, with the reason for each.

## 2. Prior art (the gap is real)

- `sporto/awesome-elm` has a small "Inspired by Elm" section (Elmish, Bolero, BuckleScript-TEA, ...). It is a flat link list: no rubric, no ecosystems, no comparison.
- GitHub topic `tea` and ecosyste.ms index individual ports, unsorted and with many dead projects.
- Some frameworks document their own relation to Elm (for example "Tyrian vs Elm" on the Tyrian site, "Prior Art" in the `Mobius.swift` wiki), but only from their own side.

No site compares TEA implementations across languages, and none maps their ecosystems against each other. The capability matrix (section 6) is the part nobody has done.

## 3. Inclusion rubric

The rule "has model, msg, update, cmd, subscription" needs sharper edges, because almost every state library claims some of these words. The proposal is to grade each concept as `native`, `managed` or `missing`, and to require evidence (a doc or source link) for every grade.

The concepts:

1. Model: one immutable state value per program (or per component).
2. Msg: a closed set of messages (sum type, or tagged union by convention in untyped languages).
3. Update: a function `Msg -> Model -> (Model, Cmd Msg)`. The key test: update itself does not perform effects; it returns them as values.
4. View: a pure function of the model. Open question: whether headless loops such as Mobius count (see section 10).
5. Cmd: effects as data, handed to the runtime, results come back as messages. This is the line that excludes plain Redux (thunks and sagas run effects imperatively outside the reducer).
6. Sub: `native` when it is a declarative function of the model (`Model -> Sub Msg`) whose start and stop the runtime manages. `managed` when the runtime offers a sanctioned long-running event source with a lifecycle (a self-rescheduling Cmd, an `EventSource`, a cancellable long-running effect). `missing` when the only option is calling `dispatch` from anywhere.
7. Ports or interop: optional, recorded but never required.

Tiers:

1. Full TEA: Model, Msg, Update, Cmd `native`; Sub `native` or `managed`.
2. TEA superset: full TEA plus more (nested stateful components, SSR and hydration, server-side TEA, typeclasses, and so on).
3. TEA-adjacent (separate page): fails at least one hard requirement. Each entry states which one.

Note on the examples named at the start: Miso passes cleanly (update schedules effects with `io`, it does not run them). Halogen does not pass the strict reading of point 3: `handleAction` runs effects directly in the `HalogenM` monad, and subscriptions are started imperatively. Halogen is as powerful as TEA but not shaped like it. The site grades this as a fourth grade, `equivalent` (same power, another shape), which a superset may use for update, Cmd and Sub (decision 1 in section 10).

## 4. Candidate list

The list lives in the data files of the site, not in this document:

- `data/frameworks.json`: 91 entries in 27 languages, each with its rubric grades, tier, targets, status and notes.
- `data/adjacent.json`: 35 TEA-adjacent libraries, each with the hard requirement it misses and why.

The tests in CI (`tests/common/data/catalog.test.ts`) decode both files and check that every framework holds the rules of its tier (`rubricProblemsOf`).

Grades come from memory plus a light web check on 2026-11-13. An entry is `verified: true` only once every grade was checked against its docs or source (40 frameworks and 6 TEA-adjacent libraries by 2026-11-14, starting with Elm, Miso, Lustre, react-tea-cup, Bubble Tea and Mobius); the page of every other entry says it is not yet checked. Checking every entry against its docs, with an evidence link per grade, is the next data task.

Added after the first draft, on review: Foldkit and tea-effect (TypeScript, on Effect), react-elmish, `@typescript-tea/core`, Ferp, Indigo, Scalm, Avalonia.FuncUI, Terminal.Gui.Elmish, gi-gtk-declarative, Pux, Spork, libcosmic, Draco, and the terminal frameworks: tears, hojicha, osteak and teatui (Rust on ratatui), Mint Tea (OCaml), Shore, Teashop and gleamtea (Gleam), Milo (Python). fastTEA, ts-elmish and Raj went to the adjacent page for lack of subscriptions.

## 5. Where Elm stands (first hypotheses)

Things Elm has that most others lack (expected "Elm has it" rows):

- `elm-review`, `elm-format`, `elm-codegen`, compiler-enforced semver in the package manager.
- `elm-program-test` (full program tests with simulated effects).
- `elm-ui`, `elm-css`, `elm-graphql`, `elm-charts`, `elm-rte-toolkit`.
- Full-stack and static-site options in the same language: Lamdera, elm-pages.

Things outside Elm that are candidates to "bring back":

1. User-defined subscriptions with resource lifecycles (Miso `createSub`, Elmish v4 keyed subs). In Elm only `elm/*` may define effect managers, so every new event source goes through ports.
2. Non-web targets: TUI (Bubble Tea, Ratatouille), native desktop (Iced, Elmish.WPF, Relm4, Monomer), native mobile (Fabulous, TCA, Mobius).
3. Server components and server-driven UI (Lustre server components).
4. Reusable stateful components with a managed lifecycle (Miso components, Lustre components as custom elements, Halogen slots). Elm avoids these on purpose; the site can show the trade-off rather than argue for it.
5. WebSockets as a first-class package (Elm 0.19 has none; most others do).
6. Exhaustive effect testing with dependency injection (TCA `TestStore`).
7. Game engine integration (Tyrian with Indigo).
8. The component library model of Bubble Tea (Bubbles: each widget is a small TEA program you embed).

This list is the most valuable output of the site and should get a written page per item, not only a matrix cell.

## 6. Data model

The comparison only works if libraries are mapped to shared capabilities, not compared by name.

Entities:

1. `Language`: name, paradigm, typing.
2. `Framework`: language, targets (web, ssr, server, desktop, mobile, tui, game), repo, status (active, low activity, archived), rubric grades with one evidence URL per grade, tier.
3. `Capability`: a node in a fixed taxonomy (section 7), with a short definition so that two libraries in two languages can be judged "the same thing".
4. `Library`: framework (one or more), capabilities (one or more), URL, repo, status, one-line description.
5. `Proposal`: a "bring back to Elm" write-up linking capabilities and libraries.

Views the site derives from this:

1. Framework page: rubric with evidence, targets, libraries grouped by capability.
2. Capability page: every implementation across all frameworks.
3. Matrix: capabilities x frameworks, each cell lists libraries or shows it empty.
4. Elm gap view: matrix filtered to rows where Elm is empty and others are not (and the reverse).
5. Adjacent page and proposals pages.

Storage: `data/frameworks.json` and `data/adjacent.json`, decoded with `io-ts` codecs (`src/common/type/framework.ts`) and checked in CI. One file per framework is an option once the library mapping makes entries large. Contributions are pull requests to the data files.

## 7. Capability taxonomy (draft)

1. Effects and platform: HTTP, JSON codecs, routing and URL, time, random, websockets, storage (local, IndexedDB), files, clipboard, interop ergonomics (ports, FFI).
2. Architecture: nested or reusable components, state machines, dependency injection, devtools and time travel, hot reload.
3. Testing: unit, effect testing, whole-program testing, snapshot and visual testing.
4. Render targets: DOM, SSR and hydration, static site, server components, custom elements, desktop, mobile, TUI, canvas and WebGL, games.
5. UI building blocks: component kits, styling, forms, tables, drag and drop, virtual lists, charts, maps, animation, rich text, date pickers, i18n, accessibility.
6. Data and backend: GraphQL, full stack, realtime sync, auth.
7. Tooling: formatter, linter, codegen, LSP, package docs, bundler integration.

The taxonomy is the hardest design work of the project: too coarse and every cell is full, too fine and every cell is empty. Start with about 40 capabilities and split only when a row is clearly hiding a difference.

## 8. Effort and scale

- Framework list: about 30 entries, curation is a few days including evidence links.
- Library mapping is the real cost. Elm alone has well over a thousand packages; Bubble Tea has thousands of dependents (most of them apps, not libraries). Rules are needed: libraries only (no apps), a minimum activity or popularity bar, and "notable" hand picks.
- Discovery seeds per ecosystem: `package.elm-lang.org` (search JSON), Pursuit, Hackage reverse dependencies of `miso`, crates.io reverse dependencies of `iced`, pkg.go.dev importers of `bubbletea`, Hex dependents of `lustre`, NuGet dependents of `Fable.Elmish`, npm dependents of `react-tea-cup` and `hyperapp`.
- LLM-assisted classification of libraries into capabilities is a good fit, with a human review step and the evidence link stored next to each mapping.
- Freshness: a crawler fills stars, last commit and archived flag from the GitHub API on a schedule (the cached crawler of `awesome-generator` is a starting point).

## 9. Risks

1. Subjectivity: grading Halogen, re-frame or Bubble Tea will be argued. Mitigation: the rubric is public, every grade has an evidence link, disputes are pull requests.
2. Staleness: the TEA world has many dead ports. Mitigation: status from the crawler, archived projects shown as historical.
3. Elm-centric framing can read as condescending to other communities. Mitigation: the matrix is symmetric; the Elm gap view is one filter, not the home page.
4. Scope creep in library mapping. Mitigation: phase it (section 11) and start with the six biggest ecosystems.

## 10. Decisions

Decided on 2026-11-13:

1. Shape or capability: capability for supersets. A fourth grade, `equivalent`, marks a concept reached in another shape; a superset may have it for update, Cmd and Sub, a full TEA entry may not. Halogen is a superset with that note.
2. A `managed` Sub is enough for full TEA, so Bubble Tea, TCA, Mobius and Lustre are in.
3. A headless loop (no view) is allowed; its view grade is `missing`.
4. Gren and Lamdera have entries of their own in the Elm family; elm-pages and elm-land stay libraries of the Elm column.
5. Site stack: React with react-tea-cup, the stack of the other web apps, built on the navigation of the realworld `frontend-web` (destination, screen stack, URL adapter). Frontend only for now, static on GitHub Pages; the data is bundled at build time.
6. A "Build your own TEA" page: eight steps in Swift, TypeScript and Kotlin. The Swift and Kotlin code is the runtime of the iOS and Android admin apps of the realworld example.

Still open:

1. Name and domain (for example "TEA Ecosystem", "Elm Architecture Atlas").
2. Whether the repository is public from the start (GitHub Pages on a free plan needs a public repository).

## 11. Phases

1. Done: the site with the rubric, the catalog of frameworks (cards and table), a page per framework, the adjacent page and the guide.
2. Next: verify every entry against its docs, with an evidence link per grade in the data.
3. Capability taxonomy, and library mapping for Elm plus the largest others (Elmish, Miso, Lustre, iced, Bubble Tea, TCA). Matrix and Elm gap view.
4. Crawler for freshness (stars, last commit, archived), the contribution guide, and an `awesome-tea` README generated from the same data with `awesome-generator`.
5. "Bring back to Elm" write-ups, one page per proposal.

## Sources

- https://github.com/sporto/awesome-elm
- https://github.com/topics/tea
- https://tyrian.indigoengine.io/03-architecture/tyrian-vs-elm/
- https://lustre.hexdocs.pm/announcements/2026-01-10.html
- https://haskell-miso.org/docs/subscriptions
- https://haskell-miso.org/docs/components
- https://pkg.go.dev/github.com/charmbracelet/bubbletea/v2
- https://www.github.com/spotify/mobius
- https://github.com/spotify/Mobius.swift/wiki/Prior-Art
- https://www.github.com/vivid-money/elmslie
- https://discourse.purescript.org/t/front-end-frameworks-flame-concur-halogen-or-something-else/3311
- https://discourse.elm-lang.org/t/bubble-tea-a-terminal-ui-framework-based-on-elm/6374
