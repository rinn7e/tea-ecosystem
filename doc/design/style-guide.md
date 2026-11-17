# Design style guide

The look of the site follows the website of Elm (`https://elm-lang.org`): the audience of the catalog is people who love Elm, so the site should feel at home next to it. It is inspired by that site, not a copy of it.

Decided on 2026-11-13, after four design explorations (`design/exploration/`, not in the repo): the owner kept the first design of the site and asked to bring it toward the aesthetic of the Elm website.

## 1. Reference screenshots

Full-page captures of elm-lang.org at 1440 px wide, taken on 2026-11-13. They are pages of another site, so they are not in the repository: the maintainer keeps them in `doc/design/elm-lang/` (ignored by git), and anyone else can open the same pages on `https://elm-lang.org`. Long pages are cut at 3000 px.

| File                                   | Page                    | Look at it for                                                                                                                |
| -------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `home.jpg`                             | `/`                     | the hero, feature rows (text left, visual right), buttons with the hard offset shadow, code boxes, bar charts, the big footer |
| `examples.jpg`                         | `/examples`             | the blue top bar, a page title, a grid of link lists                                                                          |
| `docs.jpg`                             | `/docs`                 | outline buttons, a link list with bullets                                                                                     |
| `docs-syntax.jpg`                      | `/docs/syntax`          | a long doc page with dark code blocks                                                                                         |
| `docs-from-javascript.jpg`             | `/docs/from-javascript` | side-by-side comparison tables                                                                                                |
| `docs-style-guide.jpg`                 | `/docs/style-guide`     | long-form text                                                                                                                |
| `docs-advanced-topics.jpg`             | `/docs/advanced-topics` | a list of topics with short descriptions                                                                                      |
| `community.jpg`, `community-slack.jpg` | `/community`            | sections of links                                                                                                             |
| `news.jpg`                             | `/news`                 | a list of links, a releases table with blue version links                                                                     |
| `news-*.jpg`                           | three posts             | blog posts: title, author line, text, code                                                                                    |
| `try.jpg`                              | `/try`                  | the online editor                                                                                                             |

## 2. Principles

1. Quiet and plain. White page, black text, one blue. Nothing decorates; space does the work.
2. One weight. Every text is regular (400), headings too. Hierarchy comes from size and space, never bold. The one exception: the name of an entry (on a card, in the table, in a chip of its languages and as the title of its page) is medium (500), so it stands out from its summary and its language line. An entry with no logo of its own shows the logo of its language in its tile on faint grey diagonal stripes (an entry in two languages shows both, the second in front at the bottom right, on the panel color), after a background of damn-center (`pattern-stripes`, in the `pattern` token set for each mode, sized in `em` so every tile size shows the same stripes): the stripes say it stands in for a logo. A language entry (Elm) shows its own logo with no stripes. Every tile (a logo file, a glyph such as the cup of react-tea-cup, or a language mark drawn by the site such as Elm) takes the panel and the ink of the mode (white and black in light mode, dark and light in dark mode); a logo file is drawn as it is, its own background included.
3. Flat, with one flourish: a hard offset shadow (no blur), like the buttons of the home page of Elm, used sparingly. A section of text has one box with one shadow (`sectionBoxClass`), its parts split by thin lines inside it (a list with a line under each row, or a grid on the line color, `sectionGridClass`), never a shadow under each part. A list of entries (the cards) and the category boxes carry it as things to press; the other choices (language logos, filter boxes, layout buttons) show it on hover. Code is one flat grey block (`codeBlockView`). Square or nearly square corners.
4. Narrow columns. Text never runs wider than about 600 px; a grid of items stays under about 1000 px.
5. Links are blue text, without underline (the footer is the exception: grey and underlined).

## 3. Tokens

Colors, from the computed styles of the site:

| Token     | Value     | Use                                                                  |
| --------- | --------- | -------------------------------------------------------------------- |
| page      | `#FFFFFF` | background                                                           |
| ink       | `#000E16` | text                                                                 |
| ink-muted | `#4B5560` | secondary text                                                       |
| ink-faint | `#6E7072` | captions, the footer (the Elm site uses `#8F9091`, 3.2:1)            |
| line      | `#D3D3D3` | borders, the shadow of boxes                                         |
| line-soft | `#EEEEEE` | the footer rule, row rules                                           |
| blue      | `#1293D8` | button borders and shadows, the main accent where it carries no text |
| link      | `#0B7BBE` | links, and the text and icons of the top bar                         |
| blue-soft | `#94C9EC` | chart bars that are not the subject                                  |

Accessibility: the Elm site uses `#0C91D8` for links and `#1293D8` behind white text, both about 3.4:1, below the 4.5:1 that body-size text needs. This site keeps those blues for borders and shadows, and uses the slightly deeper `#0B7BBE` (4.57:1) wherever the blue meets text.

Grades use the syntax colors of the code samples of the site, darkened so text passes 4.5:1 on white:

| Grade      | Value     | Source                    |
| ---------- | --------- | ------------------------- |
| native     | `#1A7D11` | green `rgb(40, 187, 28)`  |
| managed    | `#167A84` | teal `rgb(36, 163, 175)`  |
| equivalent | `#8F6B00` | olive `rgb(173, 173, 39)` |
| missing    | `#C23621` | red `rgb(194, 54, 33)`    |

Code (the examples of the entries and the build guide) uses the syntax colors of GitHub, the `github` theme of highlight.js in light mode and `github-dark` in dark mode (`--hl-*` in `src/asset/index.css`), on GitHub's light grey `code` background.

The button that clears the filters is orange, `reset` (`#B54D00`, `#F2994A` in dark mode), so it reads apart from the blue filters: its text passes 4.5:1 on its own 10% tint.

A card wears at most one ribbon on its right edge, under its tier badge, folded behind the edge: "Recently added" in the gold of the stars and of the New button (`star` with `on-star` text, and the same gold on the page of the entry) for an entry found in the last 30 days, and "Featured" in purple pink, `featured` (`#B02A9C` with white text, `#E98AD8` with dark text in dark mode, both above 4.5:1), for the picks of the maintainer, react-tea-cup, Indigo and Miso (`FEATURED_IDS` in `src/common/type/framework.ts`), which the default order puts right after Elm in that order. Elm has no ribbon: its tier badge, "Originator", already sets it apart.

Type:

| Role          | Font            | Size                     | Weight |
| ------------- | --------------- | ------------------------ | ------ |
| body          | IBM Plex Sans   | 16 px, line height 24 px | 400    |
| page title    | IBM Plex Sans   | 32 to 40 px              | 400    |
| section title | IBM Plex Sans   | 25 px                    | 400    |
| subsection    | IBM Plex Sans   | 19 to 20 px              | 400    |
| small         | IBM Plex Sans   | 14 px                    | 400    |
| code          | Source Code Pro | 13 px                    | 400    |

The fonts are served with the site (`public/fonts/`, the Latin files of Fontsource, under the SIL Open Font License, whose text is beside them), not from Google Fonts: the page paints from its prerendered HTML before a font from another host arrives, so the text showed in the system font first, wider and bolder, and changed when Plex came. `index.html` preloads the two weights of the first paint (400, and 500 for the names of the entries), and `src/asset/index.css` gives each font a local fallback sized to its metrics (`size-adjust` and the ascent and descent overrides), so a font that still arrives late moves nothing. A new weight or font gets its file and license in `public/fonts/` and its `@font-face` there.

Shapes:

- Box: `1px solid line`, radius 3 px, shadow `5px 5px 0 1px line`.
- Main box or button: `2px solid blue`, radius 0, shadow `5px 5px 0 1px blue`.
- Outline button: `2px solid blue`, blue text, no shadow; the selected one is filled blue with white text.
- Chips and badges: radius 2 px, a 1 px border in the color, a light tint behind.

## 4. Layout

- Every page has a full-width bar in the color of the page, with no line under it: its text, emblem and icons are in `link` blue (`accent`, the lighter blue in dark mode), and it is 80 px tall on a desktop, 72 px on a tablet and 64 px on a phone, with even room above and below its content. The site keeps its own mirror-symmetric header in that bar: two links on each side (about and build your own on the left, TEA-adjacent and rubric on the right), our emblem and the name "TEA Ecosystem" on the axis. The emblem is the link to the catalog. The link of the page shown is underlined, except the emblem: it is at full opacity on the catalog and at 70% elsewhere (full again under the pointer). Nav links are lowercase, as on the Elm site, but TEA is always written in capitals: the labels are spelled in lowercase in the code, never lowered with the `lowercase` class, which would turn TEA into tea.
- A page title sits alone, with generous space above and below (48 px or more).
- The footer: a thin `line-soft` rule, then centred grey text with underlined grey links.
- The bar is a mirror around the emblem: on its left the star count of the repository (a star over `8 stars`), on its right the code icon over the time since the site last changed (`44m ago`), both in the full blue of the bar (the brighter `edge` blue under the pointer), both short, and both opening the repository. On a desktop they sit at the two edges of the frame, outside the nav links; below it, at the two edges of the bar. The star count is read live from GitHub when the page loads, and shows only once it is there: while it loads, or when GitHub refuses, its side stays empty, never a `0` or an error. Their tooltips say both in words.
- The page scrollbar is always shown (`overflow-y: scroll` on `html`), so a short page sits on the same axis as a long one. Scrollbars use the tokens: a square `--scroll-thumb` on the page color, `edge` blue under the pointer.
- A tooltip is a small dialog: the panel color, a border and the hard offset shadow in `ink-faint` (darker than the cards, so it stands apart from them), 300 px wide, with a 15 px title and 14 px text (never smaller: it is there to be read), square, with a small arrow on its trigger: above it, or below when there is no room. It fades in rising 4 px and fades out the same way back, in 150 ms (no motion under reduced motion). It explains a badge or a cell; the page never needs a legend for what a tooltip says. A cell of the rubric strip carries the legend itself: the grades with their colors and meanings, its own grade at full strength, in a 400 px box.
- A popover (the Filters of a list) is a box with a sharp 2 px `edge` blue border, like the button that opens it, and no shadow. It fades in and out like a tooltip and closes on its button, Escape or a press outside.

### Breakpoints

Three layouts, mobile first: unprefixed classes are the phone layout, and each breakpoint only overrides the layout below it, upward. Never `md:`, `xl:`, `2xl:` or `max-*` (`doc/code-convention.md`, section Styling).

| Layout  | Prefix | From    |
| ------- | ------ | ------- |
| Phone   | (none) | 0       |
| Tablet  | `sm:`  | 640 px  |
| Desktop | `lg:`  | 1024 px |

- The phone layout is written first, for every element.
- `sm:` and `lg:` are the defaults of Tailwind, with no breakpoint of our own. `sm:` is for an element that differs on a tablet. Today it is used by the cards (two columns, and the full card in place of the denser phone card) and the top of a list (below).

### The card on a phone

Below `sm:` a card is denser, so about four fit on a 375 x 812 screen in place of under three. It keeps every piece of the card.

| Part                                | Phone                                    | From `sm:`                       |
| ----------------------------------- | ---------------------------------------- | -------------------------------- |
| Padding, and space between its rows | 10 px, 6 px                              | 18 px, 12 px                     |
| Space between cards                 | 14 px                                    | 22 px                            |
| Tile                                | 36 px (the tile of a table row)          | 44 px                            |
| Name                                | 17 px                                    | 19 px                            |
| Strip of grades                     | 16 px tall                               | 26 px tall                       |
| Summary                             | 2 lines                                  | 3 lines                          |
| Ribbon                              | under the tier badge, 34 px from the top | 52 px from the top               |
| Columns                             | 1                                        | 2 (3 from `lg:`)                 |
| Foot                                | 1 row: status dot, target icons          | 2 rows: status, targets in words |

The source link keeps a tap target of 34 px around its 24 px button (5 px more above and below).

### The top of a list on a phone

Below `sm:` the top of the catalog is tighter, so the first card shows without a scroll on a 375 x 812 screen (it started below the fold).

| Part                   | Phone                                                   | From `sm:`                                                |
| ---------------------- | ------------------------------------------------------- | --------------------------------------------------------- |
| Top bar                | 64 px, a 19 px name                                     | 72 px (80 px from `lg:`), a 22 px name (26 px from `lg:`) |
| Space above the title  | 12 px                                                   | 32 px (48 px from `lg:`)                                  |
| Title, lead            | 26 px, 14 px                                            | 32 px, 16 px                                              |
| Space before the boxes | 24 px                                                   | 44 px                                                     |
| Category boxes         | 24 px numbers                                           | 32 px numbers                                             |
| Language tiles         | 32 px, 5 px apart (9 a row)                             | 40 px, 6 px apart                                         |
| Search, Filters        | 36 px tall, the hint "Search name or language" at 14 px | 40 px, the full hint                                      |
| Filters panel          | 32 px boxes, 13 px, three a row, 12 px padding          | 36 px boxes, 14 px, 130 px wide, 16 px padding            |

The search keeps 16 px text on a phone: below that, Safari zooms the page into the field. The Filters button is its icon alone at every width (named for screen readers, "Filters" in its tooltip), with the count of filters on beside it.

## 5. Dark mode

The Elm site has none; this site keeps one. Dark derives from the same tokens: a deep navy page (`#07131B`), light ink (`#E4EEF4`), a lighter blue (`#4CB4EE`) for links and accents, the bar in the color of the page with that lighter blue, and the back-to-top button in a darker blue (`#0B5F8F`). Box shadows use a dark line (`#22323D`).

Language logos keep their brand color (Simple Icons `hex`) in both modes. A color that would fall under 3:1 against either panel (black Rust, pale Gleam pink, JavaScript yellow) is moved to the nearest shade of it that reaches 3:1 on both (`readableColorOf` in `src/common/data/language-logo/logo.ts`), so one color serves both modes and nothing switches with the theme.

## 6. Do not

- No featured card: in a row of cards, every card has the same size, border, shadow and title style. No middle card made bigger, bolder or blue to stand out (the "featured plan" of pricing tables). A blue border and shadow only mark what the user chose (a selected box or logo), never what we chose to promote.
- No clickable thing without the pointer cursor. A base rule in `src/asset/index.css` gives it to every button, select and checkbox; anything else clickable that is not a link gets `cursor-pointer`.
- Never use the Elm tangram, the "elm" wordmark or anything that reads as the official Elm site: this is a community catalog with its own name and emblem. Our emblem is a square cut into pieces in the spirit of the tangram, but with its own cuts, mirrored on the axis (section 7); never the seven pieces of the Elm logo.
- No bold, no gradients, no blur, no soft or large shadows (the hard offset shadow has no blur and stays small).
- No rounded pill shapes beyond 3 px, except round status dots.
- No emoji as icons. The one exception: a project whose own logo is an emoji or a text glyph (react-tea-cup, Milo) shows it in its tile (`logoText` in the data), as it would show a logo image.

## 7. Emblem

The emblem is a square cut into pieces, after the spirit of the Elm logo but with our own cuts, mirror-symmetric on the vertical axis. Chosen on 2026-11-13: the symmetric tangram (`doc/design/logo/b-tangram-*.svg`), a big triangle (a cup) over a diamond (its foot), with triangles around them. The other cuts drawn that day stay in `doc/design/logo/` (see its `README.md`) until the final logo is decided.

- In the bar: `emblemView` in `src/component/emblem.tsx`, an inline SVG in `currentColor`, so every piece is the blue of the bar text in both modes. The pieces sit 2 of 32 units apart (about 1.75 px at the 28 px of the bar), so the page shows through the cuts.
- Favicon: `public/favicon.svg`, with `public/favicon-32.png` and `public/apple-touch-icon.png` (180 px), the same square on a transparent background, like the Elm favicon, so the tab shows through the cuts (the apple touch icon alone stays on white, as iOS fills transparency with black): the cup and its foot (the diamond) in `#1293D8`, every side piece in `#94C9EC` (`doc/design/logo/b-tangram-f2-hourglass-light.svg`). The sides share one color on purpose: two darker triangles on either side of the axis read as eyes and turn the square into a face. The gaps are 2 of 32 units too, and 1 unit in the 32 px PNG, so they stay about 1 px at 16 and 32 px.
- Share cards, the link preview of every page (`og:image`): `dist/og/<id>.png` for an entry and `dist/og/page/<page>.png` for the other pages (1200 x 630), drawn at build time from `src/share-card.tsx` with satori and resvg (`scripts/prerender.mjs`), in the light colors of `src/asset/index.css` and IBM Plex Sans. One frame for both: a blue bar on top; a tile of 168 px; the title at 64 px with a line under it; a strip; the lead; the emblem, the name and the address of the site at the foot, with a note on the right. An entry shows its logo (the logo of its first language when it has none, or only a glyph), its kind, tier and status, the strip of its rubric in the tints of its grades, its summary in two lines at most and its stars. Another page shows the emblem, its heading (`src/common/data/page-heading.ts`, which the page draws too), a strip that says what it holds (the most used language logos for the lists, the four grades for the rubric, the parts of TEA for the about page, the three languages of the guide) and its lead in three lines at most. Every box is `display: flex` with `boxSizing: 'border-box'`, as satori lays out flexbox alone and counts padding out of a size. Check a card at about 500 px wide, the size a feed shows it.
- Never round the square, add a gradient or a shadow, or color the pieces in the four colors of the Elm logo on the site itself; the Elm colors stay a variant in `doc/design/logo/`.
