import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'

import '@/asset/index.css'

import { AppProgram } from './program'

const app = (
  <StrictMode>
    <AppProgram />
  </StrictMode>
)

// A page rendered ahead of time (`src/prerender.tsx`) already holds the
// app: React takes it over as it is. Any other is drawn from nothing: the
// dev server, `404.html`, and a link with a filter in its query, whose HTML
// is the plain page (`index.html` hides it, `data-snapshot`); a link with
// only a tracking tag in its query is hydrated.
const root = document.documentElement
const container = document.getElementById('root')
if (container) {
  if (container.hasChildNodes() && root.dataset.snapshot !== 'stale') {
    hydrateRoot(container, app)
  } else {
    container.replaceChildren()
    root.removeAttribute('data-snapshot')
    createRoot(container).render(app)
  }
}
