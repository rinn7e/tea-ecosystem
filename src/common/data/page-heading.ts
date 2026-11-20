// The pages of the site that are not the page of an entry
export type SitePage =
  'catalog' | 'adjacent' | 'rubric' | 'about' | 'build' | 'privacy'

export const sitePages: readonly SitePage[] = [
  'catalog',
  'adjacent',
  'rubric',
  'about',
  'build',
  'privacy',
]

export type PageHeading = { title: string; lead: string }

// The heading and the lead of each page: the page draws them, and its link
// preview (`src/share-card.tsx`) and its description (`src/prerender.tsx`)
// say the same
export const pageHeadingOf = (page: SitePage): PageHeading => {
  switch (page) {
    case 'catalog':
      return {
        title: 'The Elm Architecture, everywhere',
        lead: 'Every language and framework that implements Model, Msg, update, Cmd and Sub, graded against Elm, so you can see what each ecosystem has and what it could bring back.',
      }
    case 'adjacent':
      return {
        title: 'TEA-adjacent',
        lead: 'Libraries that share the vocabulary of TEA but lack a hard requirement of the rubric, graded the same way, so you can see exactly what keeps each one out.',
      }
    case 'rubric':
      return {
        title: 'What counts as TEA',
        lead: 'Almost every state library uses the words update and subscription. The rubric grades the parts that make The Elm Architecture what it is, and every grade needs evidence.',
      }
    case 'about':
      return {
        title: 'About TEA Ecosystem',
        lead: 'The Elm Architecture (Model, Msg, update, view, Cmd and Sub) started in Elm and now lives in dozens of languages. This site gathers them in one place and grades each one against Elm.',
      }
    case 'build':
      return {
        title: 'Build your own TEA',
        lead: 'A TEA runtime is small enough to write in an afternoon. Eight steps, the same in every language: no framework is needed to have The Elm Architecture on a platform that has none.',
      }
    case 'privacy':
      return {
        title: 'Privacy',
        lead: 'TEA Ecosystem is a static catalog with no accounts and no cookies. This page lists everything the site uses that could see your visit.',
      }
  }
}

// The address of each page
export const sitePagePathOf = (page: SitePage): string => {
  switch (page) {
    case 'catalog':
      return '/'
    case 'adjacent':
      return '/adjacent'
    case 'rubric':
      return '/rubric'
    case 'about':
      return '/about'
    case 'build':
      return '/build-your-own'
    case 'privacy':
      return '/privacy'
  }
}
