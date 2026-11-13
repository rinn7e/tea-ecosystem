// One shape of a language logo: filled, or drawn as a line (`stroke`, with
// `fill: 'none'`), for a mark made of strokes (Lean, Sky)
export type LogoPath = {
  d: string
  fill: string
  stroke?: string
  strokeWidth?: number
}
