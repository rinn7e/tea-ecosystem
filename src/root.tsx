import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@/asset/index.css'

import { AppProgram } from './program'

const container = document.getElementById('root')
if (container) {
  createRoot(container).render(
    <StrictMode>
      <AppProgram />
    </StrictMode>,
  )
}
