# Code convention

The rules of this app. They follow the code convention of the realworld `frontend-web` (`rinn7e/realworld-fullstack-react-tea-cup-haskell`), cut down to a frontend with no backend, plus the parts that are new here: the screen stack, the scroll of history entries and the data files.

## Contents

- [Architecture](#architecture)
- [Navigation and the URL](#navigation-and-the-url)
- [The screen stack](#the-screen-stack)
- [No update wrapper (and the URL exception)](#no-update-wrapper-and-the-url-exception)
- [Follow the component tree](#follow-the-component-tree)
- [One source of truth](#one-source-of-truth)
- [Make impossible updates impossible](#make-impossible-updates-impossible)
- [Data files](#data-files)
- [The samples of the guide](#the-samples-of-the-guide)
- [TypeScript](#typescript)
- [File structure](#file-structure)
- [Views](#views)
- [Styling](#styling)
- [Tests](#tests)

## Architecture

- The app is The Elm Architecture with `react-tea-cup` and `tea-cup-fp`: one root `Model` (`src/type.ts`), changed only through `Msg` messages in `src/update.ts`, and a tree of TEA components below it (the root, a screen, its sub-components). Each component has its own `Model`, `Msg` and `update` and talks only to its direct children.
- Every side effect (the URL, the title, the scroll, `localStorage`) runs inside a `Cmd` (`cmdSucceed` of `@rinn7e/tea-cup-prelude`), never inside an update handler.
- A parent that reacts to a message of a child does it in the `case` of that message, with `updateAndCmd` in a `pipe`. Prefer calling a handler directly over `msgCmd`, which costs an extra step.

```ts
// Bad: IO inside the handler
const handler = (model: Model): [Model, Cmd<Msg>] => {
  document.title = titleOf(model)
  return [model, Cmd.none()]
}

// Good: IO in a command
export const setTitleCmd = (model: Model): Cmd<Msg> =>
  cmdSucceed(() => {
    document.title = titleOf(model)
  })
```

## Navigation and the URL

The app owns where it is; the URL only follows. The words:

- **Destination** (`src/common/type/destination/`): where the app is, a `screen` with its params. It is never stored: `destinationOf(model)` (`src/util/destination.ts`) reads it from the models that show it.
- **Screen**: what the destination shows, with its params (`CatalogScreen` with its `filter`, `FrameworkScreen` with its `frameworkId`, `BuildScreen` with its `language`). The screen components live in `src/screen/`. There are no pages.
- **`NavigationMsg`**: every move of the app (`Navigate`, and `UrlChanged` for a landing on a history entry), handled by `navigationMsgHandler` (`src/handler/navigation-handler.ts`), which opens the screen of the destination (`openDestination`).
- **The URL** is an adapter at the edges (`src/util/url.ts`). It is written from the destination after every step (`withUrl`) and read only at boot (`bootDestinationOf`) and on a landing (`urlChangedMsg`). `parseDestination` and `toUrlString` are the only code that knows its spelling. URLs use full readable names (`/framework/miso`, `?tier=superset`, `?language=kotlin`), a choice of several is a list with plain commas (`?target=mobile,tui`), and a rename in the code never changes the spelling of a URL (an old `?includeArchived=true` still opens with every status shown).

How the history follows a step (`urlWriteOf`):

1. A landing (`UrlChanged`) already has its entry: it writes nothing, unless the app shows another destination than the one its URL opens (then it replaces).
2. The same destination writes nothing.
3. Typing in the search of a list, or changing only its order (a header of the table, or the sort menu of the cards, whose arrow keys change it at every step), replaces the entry (`isRefinement`): refining a list is not a new place.
4. A step onto a screen below the one shown goes back in the history when the entry under the current one holds its URL (`BackOrPushUrl`, see the next section).
5. Any other change of destination pushes an entry.

## The screen stack

The stack is a list at the bottom (the catalog, or the TEA-adjacent list) and the page of one of its entries over it (`listOf(entry)` says which list an entry belongs to). The rubric, the guide and Not Found stand alone: a move switches to them, it does not stack them (`screenStackOf` in `src/util/screen-stack.ts`).

- **Both lists stay alive.** The root keeps the model of each list screen (`Model.catalog`, `Model.adjacent`: the model of `catalog-screen` and of `adjacent-screen`, each wrapping its listing) under every screen, so their filters survive an entry page. Every link back to a list uses `listDestinationOf(model, kind)`.
- **Back or push.** Closing an entry page onto its list (`isScreenBelow`, read from the two destinations, whatever message made the step) goes back in the history of the browser when the entry right under the current one holds the URL it returns to (`backOrPushUrlCmd`, read from the Navigation API when the write runs). So the in-app back and the browser back are the same step, and the page closed is not pushed over the catalog. Otherwise (the page was opened from a shared link, or the browser has no Navigation API) it pushes, at the top.
- **The landing of that back** comes back as `UrlChanged` to the destination already shown. It changes no model; it only restores the scroll.
- **Scroll.** The app restores the scroll itself (`history.scrollRestoration = 'manual'`). The browser restores it when the traversal lands, before the screen of the entry is drawn, which clamped a long catalog to the height of the short page it replaced. Each history entry keeps its `scrollY` in its state: `Link` saves it at the click (`saveScrollOfEntry`), and `UrlChanged` reads it when the browser lands (`savedScrollOfEntry`). Every move sets where its screen is drawn (`Model.scroll`): a landing at the scroll saved in its entry, a step down the stack at the scroll the list was left at (`Model.listScrollY`, from the `scrollY` of the `Navigate` that left it), any other move at the top. `App` scrolls there in a layout effect (`useScrollOf`), after React has drawn the screen and before the browser paints it, so a list never shows at the top for a frame before its scroll comes back. Never scroll from a command on a move: a command runs before the next screen is drawn, while the page still has the height of the one it replaces.

## No update wrapper (and the URL exception)

Do not add a step by wrapping the whole `update` of a component to run after every message. Put the step in the `case` of the messages that change that state, with `updateAndCmd` in its `pipe`. A wrapper hides the step from whoever reads the `case`.

The one exception is the URL (`withUrl` in `src/util/url.ts`, around the root `update` in `src/program.tsx`). The URL is not state: it is written from the destination, which is read from the models, the same way the view is rendered from them. It wraps only the outermost `update`, it decides from the state before and after the step (the message only says whether the step was a landing), and its commands answer with `NoOp`, so it never writes again. Nothing else may wrap `update`.

## Follow the component tree

Components nest as a tree, and their `init` and handlers nest the same way: each one sets up or updates its own model and calls those of its direct children, nothing more. When a child must react to something new, add the step to the function that already passes this kind of change down to it, in the component that owns the child. Never reshape the code to fit navigation: navigation lives in the tree.

## One source of truth

Every fact lives in one place in the model, and the types allow only the states that can happen. Do not keep a second copy of something the model already holds, and do not add a field whose value can be worked out from another one.

- The destination is never stored. The screen model says which screen is shown (its tag, read by `currentScreenOf`), and a screen with params keeps them as fields of its own: the catalog `filter`, the framework of a framework page, the `language` of the guide.
- A change of a param (a filter, a language) only updates its owner. The URL follows after the step, with no navigation.

## Make impossible updates impossible

A fact with an owner gets a type only its owner makes, so a write that skips the owner does not type check: a branded type, `Brand<T, B>` (`src/common/type/brand-wrapper.ts`), where `B` is a `declare class` with one private method that the owner declares next to the type and never exports.

| Value                | Made only by                                                                               | So you cannot                    |
| -------------------- | ------------------------------------------------------------------------------------------ | -------------------------------- |
| `CurrentScreenModel` | `currentScreenModelOfMove` (used by the navigation only), `sameScreenWith` (`src/type.ts`) | change the screen without a move |

- Reading stays free: a brand is a subtype.
- `eslint.config.js` forbids `currentScreenModelOfMove` outside the navigation and tests.
- Review blocks a cast to an owned type outside its owner file, and a screen model fresh from a screen `init` handed to `sameScreenWith` (that is a move).

## Data files

- The catalog is `data/frameworks.json` and `data/adjacent.json`, decoded at load with the `io-ts` codecs of `src/common/type/framework.ts` (`decodeOrThrow` in `src/common/data/catalog.ts`). The tests decode them in CI, so a file that does not decode never ships.
- Every framework must hold the rules of its tier (`rubricProblemsOf`): full TEA needs Model, Msg, update and Cmd `native` and Sub `native` or `managed`; a superset may have `equivalent` for update, Cmd and Sub. A library that fails goes to `data/adjacent.json` with the requirement it misses and why.
- An `id` is the URL segment of the page (`/framework/<id>`): lowercase words joined by `-`, unique across both files, never renamed.
- `verified: true` only when every grade of the entry was checked against its docs or source.
- `discoveredAt` is the day the entry was added to the catalog (`YYYY-MM-DD`), on every entry: the day of the commit that adds it. An entry added after the first list (`FIRST_LIST_DAY`, 2026-11-13) shows the ribbon "Recently added" on its card and its page for `RECENT_DAYS` (30) days (`isRecentlyAdded`); on its page the ribbon also holds the day it was added (`addedView`), which an older entry shows as a plain date in the same place; the root passes the first day that still counts (`recentSinceOf`), so a view is drawn again once a day, not every minute. The table shows the day in its Added column instead of a ribbon.
- `repo` is required: the full URL of the public repository of the entry (`https://<host>/<owner>/<name>`), on any host: GitHub, GitLab, Codeberg or another Gitea. Check the README and the registry page (crates.io, pub.dev) for it first. Only when the source is not public (hojicha: a Gitea that needs a sign-in) does `repo` fall back to the website of the entry, and `website` then holds the same URL. That equal `website` is what marks the fallback: the code and `scripts/fetch-repo-stats.mjs` tell the two apart by it (`hasPublicRepo`), so a repository on any host, a self-hosted Gitea or Forgejo included, counts as public, and a test lists the entries that fall back. `stars`, `createdAt` and `updatedAt` (the day of the last push, or of the last activity on GitLab and Gitea) come from a repository: refresh them with `GITHUB_TOKEN=<token> node scripts/fetch-repo-stats.mjs`, then `pnpm run format`; the script skips a `repo` that falls back to the website. Both lists show Elm (the Originator) first, then `react-tea-cup` (the pick of the maintainer, and the library the site is built with), then the most starred; an entry with no public repository has no stars and comes last.
- `website` is optional: the own website or docs of the entry, apart from its repository (`https://sky-lang.org` for Sky, a reference page such as `https://react.dev/reference/react/useReducer`). Leave it out when the repository is all an entry has (react-tea-cup).
- `source` is the full URL of the directory of an entry inside `repo` when it is one package of a monorepo (Tyrian and Indigo in `indigoengine`, Oak in the repository of the Monad language, `@xstate/store` in `statelyai/xstate`, and an entry that is one function of a bigger library takes its own reference page, its `website`: `useReducer` opens `https://react.dev/reference/react/useReducer`). A repository that is the project itself keeps its root, even when it holds several packages (Foldkit, Yew, Phoenix), on the default branch of that repository. The star button and the source link at the top of the page of an entry both open `sourceUrlOf` (`source`, else `repo`), so they always match and always lead to the source; `website` shows under its summary when it is not the address the source link already opens.
- `data/snippet/<id>.<extension>` is the example of an entry, shown highlighted on its page (the extension picks the grammar, `src/common/data/snippet.ts`), and `snippetSource` is the URL it was copied from. Copy it from the entry's own README, docs or official examples, never from memory: cut lines that are not about the loop (imports, setup, comments), keep the rest as written, and stay near 40 lines. An entry whose own docs show no example has no file. The tests check that every file names an entry and every example has its source.
- `logo` names a file in `public/logo/`: the project's own logo (the avatar of its own GitHub organization, or the logo of its README), square or with the mark in its centre. Never the avatar of a person or of a parent company. Without one, the tile shows a monogram; a language entry (`isLanguageEntry`: Elm, Gren) shows its language logo from Simple Icons instead.
- Text in the data is plain ASCII: no curly quotes, no long dashes, no apostrophes in contractions.
- Read the source before writing a fact about an entry: open its README (and its website when it has one) for every entry you set a `logo`, `status` or `repo` on. API fields are not enough: an archived repository may only have moved (Tyrian and Indigo moved into `PurpleKingdomGames/indigoengine` in 2025, so their `repo` is the new one and `originRepo` the old one), an active one may be abandoned in its README (Seed), and a logo may be an emoji or a glyph in the title (react-tea-cup, Milo: `logoText`). Check every entry, not a sample.

## The samples of the guide

- The code of "Build your own TEA" is one plain text file per step and language: `src/screen/build-screen/snippet/<number>-<id>.<language>.txt`, imported raw (`import.meta.glob` with `?raw`) and highlighted once at load (`step.ts`).
- They are text, not code of this app: not compiled, linted or formatted (`.prettierignore`). Keep them compiling in their own language when you edit them.
- The Swift and Kotlin runtime samples come from the iOS and Android admin apps of the realworld example; keep them close to that source, which the page links.
- `tests/screen/build-screen/step.test.ts` checks that every step has a sample in every language.

## TypeScript

- Define a type explicitly and annotate its codec with it (`export const FrameworkJson: t.Type<Framework> = ...`); never `t.TypeOf<typeof ...>`.
- No type assertions (`as`), enforced by lint, except the makers of an owned type; prefer `satisfies` and type guards.
- No type synonyms that only rename a type.
- Prefer `fp-ts` with `pipe` over plain array and object methods (`A.map`, `O.fold`), and import modules by name (`fp-ts/Option`, never `fp-ts/lib/Option`).
- No `let`: use `const`, ternaries and pure helpers.
- No early returns: write the full `if / else if / else` tree. Use a `switch` on the `_tag` of a union.
- An `Eq` of a union checks each variant explicitly.
- Imports in three groups (libraries, `@/` paths, relative paths), sorted by Prettier.
- Re-export only from `index.ts` files.

## File structure

- File and folder names are singular and kebab-case. Global styles are in `src/asset/`.
- A component (or screen) is split into `type.ts` (`Model`, `Msg`, `Props`, their `Eq`), `update.ts` (`init`, `update`), `component.tsx` (the views, exporting only the memo version), `index.ts` (re-exports `type`, `update` and its other modules, such as `subscription` or `util`, never `component`) and, when it listens to something, `subscription.ts`.
- Every screen has these files, also one with no state yet (the rubric, the about page): its `Model` is empty and its `Msg` is a `NoOp`, so a feature on it starts from its own folder and does not have to build the frame first. Its `ScreenModel` variant carries the model, and the root `update` hands each screen message to the `update` of its screen. The framework page has a `Model` and no `Msg` yet (it was split before this rule) and gets the `NoOp` frame with its first message. The root keeps the model of the two list screens in `Model.catalog` and `Model.adjacent` instead of in the `ScreenModel` (see [The screen stack](#the-screen-stack)).
- `not-found-screen` is the one screen kept as a lone `component.tsx`, as in the realworld `frontend-web`: it is a static message with a link back to the catalog, which shows for any address the app does not know, so it has nothing to hold or change.
- Dependency order: `src/common/` imports nothing outside `common/`; then `src/component/`; then `src/screen/`; then the root (`src/handler/`, `src/util/`, `src/type.ts`, `src/update.ts`, `src/app.tsx`).

## Views

- Two pages that show the same kind of data use one component in `src/component/`, fed from each screen with its own data: the catalog and the TEA-adjacent page are both `src/component/listing/` over `data/frameworks.json` and `data/adjacent.json`. Never build a second, simpler copy of a view for the second source.

- A dumb view (no hooks, no state) is a camelCase view helper called inline, `xxxView({ ... })`, returning JSX.
- PascalCase JSX only for memo components (`XxxMemo`, with a `PropsEq`) or components that need hooks (`Link`).
- `EqAlways` only for values that never change (the dispatcher).
- Memo where a draw costs something, so a change of the root model (a resize, a tooltip, the scroll) does not draw the whole page again: every screen, the listing, the bar, the tab bar and the footer are `XxxMemo` with a `PropsEq` (or plain `memo` with no props). A component that is one small box redrawn only by its own model (the tooltip layer, the back to top button) stays a view helper.
- Pass a memo component the value it draws from, not the raw input: the root passes the listing `logosPerRow` (`logosPerRowOf` the window width), so a resize draws the list again only when that number changes.
- A tooltip is the TEA tooltip of `src/component/tooltip/`, never a `title` attribute or a library: wrap the thing in `TooltipTrigger` with its `content` as data (`{ title, text }`). The root model holds the one tooltip of the app (open delay, a `seq` against stale timers, `warm` so a row of triggers opens at once), its subscription closes it on Escape, scroll, resize or a press, and the root draws it in one fixed layer.
- A link never sits inside another link. A card that opens a page and also holds a link of its own (the code button of a listing card) is a `relative` box whose title `Link` stretches over it with `stretched-link` (`src/asset/index.css`); the inner link, and every part with a tooltip, is raised above it with `relative z-10`.
- A press shows the hover look: the `hover` variant of `src/asset/index.css` also holds on `:active`, so a tap on a phone answers at once. Give everything clickable a `hover:` style, and never add a separate press style.

## Styling

- The look follows the website of Elm: read [doc/design/style-guide.md](design/style-guide.md) (tokens, type, shapes, what not to do) and the pages of elm-lang.org it lists (section 1) before changing the UI.
- Tailwind v4 with the tokens of `src/asset/index.css` (`bg-panel`, `text-ink-muted`, `text-accent` for blue that meets text, `border-edge` for the brighter blue of borders, `bg-bar` for the top bar, one color per grade). The tokens switch for dark mode, so classes need no `dark:` variants.
- Every text is regular weight (`font-normal`); hierarchy comes from size and space. Boxes take the hard offset shadow (`offset-shadow`, or `offset-shadow-edge` for the main one) and square corners (3 px at most).
- Mobile first: unprefixed classes for phones and portrait tablets, `lg:` for desktop. No `sm:`, `md:` or `max-*` breakpoints. Exception: an element that needs its own layout between a phone and a desktop uses `tablet:` (640 px, defined in `src/asset/index.css`), and says so in a comment. Today the cards use it (two columns) and the age of the repository in the bar (the compact `3h ago` on a phone, `3 hours ago` from a tablet up); everything else stays on the phone layout up to `lg:`.
- A layout that depends on the width of the window beyond what CSS can do (how many language logos fit a row) reads `windowWidth` from the root model (or a value the root derives from it, such as `logosPerRow`), kept by `windowWidthChanges` in `src/common/util/window-width.ts`; a view never reads the window itself.
- The same goes for the time: a view that shows how long ago something was (`relativeTimeOf` in `src/common/util/date.ts`) reads `now` from the root model, read at boot and refreshed every minute by a `Time.every` subscription; a view never calls `Date.now()` itself.
- No margin utilities: space with the padding or `gap` of the parent.
- Spacing and sizes in explicit pixels in brackets (`px-[16px]`); font sizes in `rem` (`text-sm`, `text-[0.8125rem]`).
- Mirror-symmetric frames: the header is a `grid-cols-[1fr_auto_1fr]` with the emblem on the axis, cards in a row are all the same size (no featured middle card, see the style guide), and headings are centred while long text stays left-aligned in a centred column.
- Nothing heavy for the GPU: no `backdrop-filter` or blur, no large shadows, no looping animation. Plain borders and solid or semi-transparent backgrounds.
- Icons are SVG (`@tabler/icons-react`), never emoji.

## Tests

- Vitest, in `tests/`, mirroring the path of the code under test (`src/util/url.ts` is `tests/util/url.test.ts`), importing through `@/`.
- Build models the way the app does: `bootOn(path)` and `navigate` in `tests/helper/app.ts`, never by hand.
- Before calling a change done: `pnpm run check`, `lint`, `format:check` and `test`, then check the change in a browser (both color schemes, and 375 px wide with no horizontal scroll).
