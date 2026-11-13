// A section heading centred between two thin rules
export const sectionTitleView = ({ title }: { title: string }) => (
  <div className='grid grid-cols-[1fr_auto_1fr] items-center gap-[14px]'>
    <span className='bg-line h-px' />
    <h2 className='text-ink-muted text-center text-sm font-normal tracking-wide uppercase'>
      {title}
    </h2>
    <span className='bg-line h-px' />
  </div>
)

// The box of a section: its one offset shadow, so a section reads as one
// block. Its parts sit inside it, split by lines: a list with a line under
// each row (`bg-panel`), or a grid whose 1px gaps show the line color of
// the box under cells of the panel color (`sectionGridClass`).
export const sectionBoxClass =
  'border-line offset-shadow overflow-hidden rounded-[3px] border'

export const sectionGridClass = 'bg-line grid gap-px'
