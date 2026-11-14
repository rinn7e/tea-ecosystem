// The one look of code on the site (the example of an entry, the steps of
// the guide): compact, like code on GitHub, a grey box with no border or
// shadow. Long lines wrap, so it never scrolls sideways. `html` is the
// output of highlight.js.
export const codeBlockView = ({ html }: { html: string }) => (
  <pre className='bg-code rounded-[3px] p-[16px] font-mono text-[0.875rem] leading-[1.35] break-words whitespace-pre-wrap'>
    <code className='hljs' dangerouslySetInnerHTML={{ __html: html }} />
  </pre>
)
