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
2. One weight. Every text is regular (400), headings too. Hierarchy comes from size and space, never bold. The one exception: the two letters of a monogram tile (an entry with no logo) are semibold (600) and black, so they read as a mark next to the logo tiles.
3. Flat, with one flourish: a hard offset shadow (no blur), like the buttons of the home page of Elm, used sparingly. A section of text has one box with one shadow (`sectionBoxClass`), its parts split by thin lines inside it (a list with a line under each row, or a grid on the line color, `sectionGridClass`), never a shadow under each part. A list of entries (the cards) and the kind boxes carry it as things to press; the other choices (language logos, filter boxes, layout buttons) show it on hover. Code is one flat grey block (`codeBlockView`). Square or nearly square corners.
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
| link      | `#0B7BBE` | links, and the top bar behind white text                             |
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

Type:

| Role          | Font            | Size                     | Weight |
| ------------- | --------------- | ------------------------ | ------ |
| body          | IBM Plex Sans   | 16 px, line height 24 px | 400    |
| page title    | IBM Plex Sans   | 32 to 40 px              | 400    |
| section title | IBM Plex Sans   | 25 px                    | 400    |
| subsection    | IBM Plex Sans   | 19 to 20 px              | 400    |
| small         | IBM Plex Sans   | 14 px                    | 400    |
| code          | Source Code Pro | 13 px                    | 400    |

Shapes:

- Box: `1px solid line`, radius 3 px, shadow `5px 5px 0 1px line`.
- Main box or button: `2px solid blue`, radius 0, shadow `5px 5px 0 1px blue`.
- Outline button: `2px solid blue`, blue text, no shadow; the selected one is filled blue with white text.
- Chips and badges: radius 2 px, a 1 px border in the color, a light tint behind.

## 4. Layout

- Every page has a full-width blue bar (`link` blue), 64 px tall, with white text. The site keeps its own mirror-symmetric header in that bar: two links on each side (about and build your own on the left, TEA-adjacent and rubric on the right), our emblem and the name "TEA Ecosystem" on the axis. The emblem is the link to the catalog. The link of the page shown is underlined, except the emblem: it is at full opacity on the catalog and at 70% elsewhere (full again under the pointer). Nav links are lowercase, as on the Elm site, but TEA is always written in capitals: the labels are spelled in lowercase in the code, never lowered with the `lowercase` class, which would turn TEA into tea.
- A page title sits alone, with generous space above and below (48 px or more).
- The footer: a thin `line-soft` rule, then centred grey text with underlined grey links.
- The page scrollbar is always shown (`overflow-y: scroll` on `html`), so a short page sits on the same axis as a long one. Scrollbars use the tokens: a square `--scroll-thumb` on the page color, `edge` blue under the pointer.
- A tooltip is a small dialog: the panel color, a border and the hard offset shadow in `ink-faint` (darker than the cards, so it stands apart from them), 300 px wide, with a 15 px title and 14 px text (never smaller: it is there to be read), square, with a small arrow on its trigger: above it, or below when there is no room. It fades in rising 4 px and fades out the same way back, in 150 ms (no motion under reduced motion). It explains a badge or a cell; the page never needs a legend for what a tooltip says. A cell of the rubric strip carries the legend itself: the grades with their colors and meanings, its own grade at full strength, in a 400 px box.
- A popover (the Filters of a list) is a box with a sharp 2 px `edge` blue border, like the button that opens it, and no shadow. It fades in and out like a tooltip and closes on its button, Escape or a press outside.

## 5. Dark mode

The Elm site has none; this site keeps one. Dark derives from the same tokens: a deep navy page (`#07131B`), light ink (`#E4EEF4`), a lighter blue (`#4CB4EE`) for links and accents, and the bar in a darker blue (`#0B5F8F`). Box shadows use a dark line (`#22323D`).

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

- In the bar: `emblemView` in `src/component/emblem.tsx`, an inline SVG in `currentColor`, so every piece is the white of the bar text in both modes. The pieces sit 2 of 32 units apart (about 1.75 px at the 28 px of the bar), so the bar shows through the cuts.
- Favicon: `public/favicon.svg`, with `public/favicon-32.png` and `public/apple-touch-icon.png` (180 px), the same square on a transparent background, like the Elm favicon, so the tab shows through the cuts (the apple touch icon alone stays on white, as iOS fills transparency with black): the cup and its foot (the diamond) in `#1293D8`, every side piece in `#94C9EC` (`doc/design/logo/b-tangram-f2-hourglass-light.svg`). The sides share one color on purpose: two darker triangles on either side of the axis read as eyes and turn the square into a face. The gaps are 2 of 32 units too, and 1 unit in the 32 px PNG, so they stay about 1 px at 16 and 32 px.
- Link preview: `public/og-image.png` (2400 x 1260, the `og:image` of `index.html`), a plain screenshot of the live catalog in light mode at a 1600 x 840 window and a scale of 1.5, so the hero, the logo rows and the first three cards show. The relative time under the GitHub icon is hidden for the shot, as an image never updates. Take it again when the catalog changes its look.
- Never round the square, add a gradient or a shadow, or color the pieces in the four colors of the Elm logo on the site itself; the Elm colors stay a variant in `doc/design/logo/`.
