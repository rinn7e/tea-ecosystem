import { type LogoPath } from './language-logo-path'

// The wordmark of Lean (LEAN, with an upside down A), which Simple Icons
// does not carry. Redrawn as lines from the logo of the Lean community
// (`img/lean_logo.svg` of leanprover-community.github.io), thicker so it
// still reads at the size of an icon. In the color of the text, so it
// shows on both themes.
export const leanLogoPaths: LogoPath[] = [
  {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 10,
    d: 'M12 22V92H104M58 22H104V92M58 57H153M104 22L137 92L170 22V92M170 22L228 92V22',
  },
]
