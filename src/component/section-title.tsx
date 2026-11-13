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
