// The emblem of TEA Ecosystem, in the bar, the tab bar and the footer. A
// square cut into pieces, mirrored on the axis x = 16: a big triangle (a
// cup) over a diamond (its foot), with triangles around them. The pieces
// sit 2 units apart, so the bar shows through the cuts. They are drawn in
// `currentColor`, the white of the bar text, in both modes
export const emblemView = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox='0 0 32 32'
    fill='currentColor'
    aria-hidden='true'
  >
    <path d='M2.41 1L29.59 1L16 14.59Z' />
    <path d='M16 17.41L22.59 24L16 30.59L9.41 24Z' />
    <path d='M1 2.41L13.59 15L1 15Z' />
    <path d='M31 15L18.41 15L31 2.41Z' />
    <path d='M1 17L13.59 17L1 29.59Z' />
    <path d='M31 29.59L18.41 17L31 17Z' />
    <path d='M2.41 31L8 25.41L13.59 31Z' />
    <path d='M18.41 31L24 25.41L29.59 31Z' />
  </svg>
)
