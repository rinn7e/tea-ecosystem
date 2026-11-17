# Changelog

What changed on [tea.rinn7e.com](https://tea.rinn7e.com/), newest first.

## 2026-11-17

- A returning visitor downloads less after each update: the libraries come in files of their own, which stay in the cache of the browser while the weekly data changes.
- A link with only a tracking tag (Facebook adds `?fbclid=...`) now shows its page at once, as a plain link does.
- The star count in the bar shows from the first paint (the build reads it), and a browser asks GitHub for a fresh one at most once an hour, so a busy network no longer runs into the limit of GitHub.
- The text no longer changes its spacing and weight a moment after the page shows: the fonts come with the site and arrive before the first paint.
- On the page of an entry, the whole language line ("Haskell framework") is the link.
- On the page of an entry, its language ("Go framework") opens the list of that language, in the main catalog or TEA-adjacent.
- Every other page (the catalog, TEA-adjacent, the rubric, about and the guide) shares a card of its own too, in place of a screenshot that was too small to read in a feed, and has its own description.
- A link to an entry, shared on Facebook, Reddit, Slack or X, shows a card of that entry: its logo, its kind, its tier, its grades, its summary and its stars.
- A link with a tracking tag (Facebook adds `?fbclid=...` to every link it opens) no longer shows "Nothing here" on the page of an entry, the rubric or the about page.
- Every page is rendered to HTML ahead of time, so it shows as soon as the HTML arrives, without waiting for the script of nearly 1 MB, then becomes interactive with no flicker. Each entry has its own title and link preview, and search engines see every page.
- Faster first page: the logos are 144 px WebP instead of PNG of up to 256 px, and load only when they scroll into view. All the logos together went from 1.2 MB to 166 KB. A test keeps each logo under 20 KB.

## 2026-11-15

- The status of an entry (active, quiet, archived) follows the last push of its repository, so it always agrees with the dates on its card. No push for two years means archived.
- The site moved to its own address, `tea.rinn7e.com`. Old links under `rinn7e.com/tea-ecosystem/` redirect to it.
- A "Featured" ribbon on the picks of the maintainer (react-tea-cup, Indigo, Miso).
- An entry with no logo shows the logo of its language; an entry in two languages shows both.
- The bar shows the star count of the repository and how long ago the site changed.
- Denser cards and toolbar on a phone.

## 2026-11-14

- A weekly AI search proposes new entries, and merges them when they pass fixed rules.
- A New button shows the newest entries first.
- The grades of the TEA-adjacent libraries are verified against their source.

## 2026-11-13

- First version: the catalog, a page per entry, the rubric and the TEA-adjacent list.
