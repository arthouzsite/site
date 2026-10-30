/** Amber triangle + ART HOUZ lettering, shared by the header and footer. */
export function Wordmark() {
  return (
    <>
      <span aria-hidden="true" className="block h-5 w-4 bg-amber [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
      <span className="text-[16px] leading-none font-medium tracking-[0.34em]">ART HOUZ</span>
    </>
  )
}
