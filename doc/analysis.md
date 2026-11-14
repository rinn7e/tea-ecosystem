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

Where each grade ends (decision 9 of 2026-11-14, section 10), as the verified entries already grade:

1. Ports: `native` is typed ports in and out (Elm `port`, Foldkit `Port`, Halogen `HalogenIO`); `managed` is a handle the runtime gives the host to send messages in (`dispatch`, `send`, `push`, `Program.Send`); `equivalent` is a sanctioned way to reach the host that is not a port (an effect type, an effect manager or a host of your own: `Cmd.OfJS`, `reg-fx`, the drivers of Cycle.js, a send-only `Cmd.port`); `missing` is only calling the host language directly. An entry gets the strongest it has.
2. Sub: `managed` needs a source that is returned (as an effect) or declared (in the view, a machine, the setup of the program) and that the runtime starts and stops. A source that update or a handler starts imperatively is `equivalent`, even when the runtime stops it on unmount (Halogen, decision 7).
3. Update: an update or a handler that runs effects itself is `equivalent` (Halogen, Yew, Phoenix LiveView, AppRun). A pure reducer whose effects run in a separate layer before it (middleware, an executor, `mutate`) keeps update `native` and grades Cmd `equivalent` (Redux, ReSwift, ReactorKit, MVIKotlin).
4. Cmd: a closed set of effects is `native` when it can start the work the entry is for (Elm has `Task` and `Http`); a set with no way to start work outside update is `equivalent` (Mint Tea).
5. Superset: nested components count when the runtime holds their state (Miso, Fabulous `Context.Mvu`, the hooks of Avalonia.FuncUI, `wrapWithLocalState` of PureScript Elmish, the loop of each react-elmish component). The nested pattern of Elm (a child model kept in the model of the parent, routed by hand or by a lens: Monomer composites, Foldkit `Submodel`, Scalm components) is full TEA.
6. Model: one state value changed in place still counts (masc, bare-tui); observable state that the framework tracks field by field is `equivalent` (MobX, Pinia, Comet).
7. View: a headless core with only a render callback or a binding module is `missing` (decision 3, Mobius).

Tiers:

1. Full TEA: Model, Msg, Update, Cmd `native`; Sub `native` or `managed`.
2. TEA superset: full TEA plus something beyond it (nested stateful components, SSR and hydration, server-side TEA, typeclasses, and so on), named in its notes. An entry with nothing beyond TEA is full TEA.
3. TEA-adjacent (separate page): fails at least one hard requirement. Each entry states which one, in its first note.

The test behind the tiers is the port-back test: a program written with an entry of the catalog ports back to Elm in the same shape. Not the same code, but the gist: its model becomes a `Model`, its messages a `Msg`, its update an Elm `update` whose effects go into the `Cmd` it returns, and its subscriptions Elm `subscriptions`, with no part restructured. What a superset adds (components, SSR) may have no Elm counterpart, but its core loop ports as it is.

Note on the examples named at the start: Miso passes cleanly (update schedules effects with `io`, it does not run them). Halogen does not: `handleAction` runs effects directly in the `HalogenM` monad, and subscriptions are started imperatively, so porting a Halogen program back to Elm means pulling every effect out into a `Cmd`, a redesign rather than a port. Halogen is as powerful as TEA but not shaped like it. The site grades such a part with a fourth grade, `equivalent` (same power, another shape), which describes the part and never qualifies an entry for a tier (decision 1 in section 10), so Halogen is TEA-adjacent.

## 4. Candidate list

The list lives in the data files of the site, not in this document:

- `data/frameworks.json`: the entries of the catalog, each with its rubric grades, tier, targets, status and notes.
- `data/adjacent.json`: the TEA-adjacent libraries, each with the hard requirement it misses and why.

The tests in CI (`tests/common/data/catalog.test.ts`) decode both files and check that every entry holds the rules of its tier (`rubricProblemsOf`): no entry of the catalog misses a requirement of full TEA, and every entry of the adjacent list misses one and says which.

The grades of the first list came from memory plus a light web check on 2026-11-13. An entry is `verified: true` only once every grade was checked against its docs or source, with the evidence of each grade in its `notes`; the page of an entry with `verified: false` says it is not yet checked. A one-time check of every entry listed by 2026-11-14 (issue #5, by language and by list) brought the entries with `verified: false` to 0, of 97 frameworks and 38 TEA-adjacent libraries: it changed 119 grades and the tier of 21 entries: Relm4, Seed, Draco and Mint Tea went to the adjacent page, redux-loop, re-frame and Raj came from it, and 14 entries of full TEA became supersets. The weekly search merges a candidate on its own only when every grade of it is verified (`scripts/judge-discovered.sh`); otherwise a person reviews it.

Added after the first draft, on review: Foldkit and tea-effect (TypeScript, on Effect), react-elmish, `@typescript-tea/core`, Ferp, Indigo, Scalm, Avalonia.FuncUI, Terminal.Gui.Elmish, gi-gtk-declarative, Pux, Spork, libcosmic, Draco, and the terminal frameworks: tears, hojicha, osteak and teatui (Rust on ratatui), Mint Tea (OCaml), Shore, Teashop and gleamtea (Gleam), Milo (Python). fastTEA, ts-elmish and Raj went to the adjacent page for lack of subscriptions; Raj came back with the check of issue #5 (2026-11-14), which found the declarative subscriptions of raj-subscription, the companion package of its author.

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

1. Shape or capability: shape, for every tier (changed on 2026-11-14, decision 7 below). A fourth grade, `equivalent`, marks a concept reached in another shape; it describes the concept and never qualifies an entry for a tier, the superset tier included. At first a superset could have it for update, Cmd and Sub, and Halogen was a superset with that note; it is TEA-adjacent now.
2. A `managed` Sub is enough for full TEA, so Bubble Tea, TCA, Mobius and Lustre are in.
3. A headless loop (no view) is allowed; its view grade is `missing`.
4. Gren and Lamdera have entries of their own in the Elm family; elm-pages and elm-land stay libraries of the Elm column.
5. Site stack: React with react-tea-cup, the stack of the other web apps, built on the navigation of the realworld `frontend-web` (destination, screen stack, URL adapter). Frontend only for now, static on GitHub Pages; the data is bundled at build time.
6. A "Build your own TEA" page: eight steps in Swift, TypeScript and Kotlin. The Swift and Kotlin code is the runtime of the iOS and Android admin apps of the realworld example.

Decided on 2026-11-14:

1. Name and place: "TEA Ecosystem", public from the start, at `https://rinn7e.com/tea-ecosystem/` on GitHub Pages.
2. The two lists point to each other: a search or a filter that matches entries of the other list says so, above the results or in place of them, with a link that opens the other list under the filters both lists share. The filters of one list (the tier and the category of entry, or what an entry lacks) stay behind.
3. The archive stays hidden by default, but a filter that narrows the list says how many archived entries also match, with "Show the archived" and then "Hide the archived". With no narrowing filter the archive is not news, so the line does not show.
4. Every box of a filter ticked narrows nothing, as no box ticked does, but stays ticked on screen and counts on the Filters button.
5. Every entry has a `repo`, which falls back to its website when its source is not public, and the time it was added (`discoveredAt`, in UTC, shown as its day): an entry added after the first list wears "Recently added" for 30 days.
6. The page of an entry lists the other entries in any of its languages from both lists, each list under its own label.
7. The strict rule (issue #8): `equivalent` never qualifies a tier, judged by the port-back test (section 3). Every tier of the catalog needs Model, Msg, update and Cmd `native` and Sub `native` or `managed`; a superset differs from full TEA only by what it adds, named in a note that starts with `Superset: `. Halogen moved to the adjacent page (it misses update, Cmd and Sub), and libcosmic from superset to full TEA (what it adds on iced is a toolkit, not a part of the architecture). Every TEA-adjacent library starts its notes with the requirements it misses (`Misses Cmd: ...`), and a test checks both lists against the rule.
8. The catalog finds new entries on its own (issue #2): a weekly workflow runs an agent on the Claude Agent SDK (`scripts/discover-agent.mjs`, Claude Opus at medium effort, at most 3 candidates, 150 turns and 5 dollars a run) with the prompt `.github/discover-prompt.md`. The agent reads untrusted pages, so it runs in a job whose token can only read, and only commits on the local branch of the run, one commit per candidate; a second job, with no agent, checks the final data of the branch (new entries only, existing entries unchanged, the tests pass), makes a fresh commit of it, so no commit of the agent is ever pushed, and opens one draft pull request for the run. It merges that pull request on its own when every candidate passes fixed rules of the data (`scripts/judge-discovered.sh`: at least 5 stars, pushed to in the last year and not archived, verified grades, an example of at most 90 lines), decided by the owner on 2026-11-14; otherwise a person reviews and merges it. One pull request a run, and none while an earlier one is open, because candidates in separate pull requests all edit the same array of `data/frameworks.json` and conflict once one merges. A turned down project goes to `data/rejected.json` with the day and the reason. It first ran through `anthropics/claude-code-action`, but that runs Claude Code, which the promotional API credit of the owner does not cover, so the first run was refused for credit; the Agent SDK is covered (2026-11-14).
9. Where each grade ends (issue #5): the seven lines after the concepts in section 3, written down when the one-time check of every listed entry showed that the rubric left the edges of `managed` and `equivalent`, the ports grades and the bar of a superset open, so entries with the same API were graded apart. They follow how the verified entries and decision 7 already graded; a verified entry that disagrees with them stays as it is until it is checked again.

## 11. Phases

1. Done: the site with the rubric, the catalog of frameworks (cards and table), a page per framework, the adjacent page and the guide.
2. Done (2026-11-14, issue #5): every entry verified against its docs, with the evidence of each grade in its notes.
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
